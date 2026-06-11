'use client';

import { useState, useCallback, useEffect } from 'react';

export type HeartRateState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'reading' }
  | { status: 'error'; message: string };

export function useHeartRate() {
  const [state, setState] = useState<HeartRateState>({ status: 'idle' });
  // Evaluated in useEffect so SSR and client hydration both start false,
  // then the client sets the real value after mount.
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(navigator.bluetooth != null);
  }, []);

  const read = useCallback(async (): Promise<number | null> => {
    if (!isSupported || !navigator.bluetooth) return null;

    setState({ status: 'connecting' });

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });

      if (!device.gatt) throw new Error('Device has no GATT server');

      const server = await device.gatt.connect();

      setState({ status: 'reading' });

      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');

      const bpm = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('No reading received within 10 seconds')),
          10_000,
        );

        const handler = function (this: BluetoothRemoteGATTCharacteristic) {
          clearTimeout(timeout);
          const val = this.value!;
          const flags = val.getUint8(0);
          const heartRate = flags & 0x01 ? val.getUint16(1, true) : val.getUint8(1);
          characteristic.removeEventListener('characteristicvaluechanged', handler);
          characteristic.stopNotifications().catch(() => {});
          resolve(heartRate);
        };

        characteristic.addEventListener('characteristicvaluechanged', handler);
        characteristic.startNotifications().catch(reject);
      });

      server.disconnect();
      setState({ status: 'idle' });
      return bpm;
    } catch (e: unknown) {
      const err = e as Error;
      // NotFoundError = user dismissed the device picker — not an error worth surfacing
      if (err.name === 'NotFoundError') {
        setState({ status: 'idle' });
      } else {
        setState({ status: 'error', message: err.message || 'Failed to read heart rate' });
      }
      return null;
    }
  }, [isSupported]);

  const clearError = useCallback(() => setState({ status: 'idle' }), []);

  return { read, state, isSupported, clearError };
}
