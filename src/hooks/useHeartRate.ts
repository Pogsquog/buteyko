'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';

export type HeartRateState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'reading' }
  | { status: 'error'; message: string };

const READ_TIMEOUT_MS = 10_000;

/**
 * Reads a single measurement from the standard Bluetooth heart-rate profile.
 *
 * The first byte of the characteristic is a flag field; bit 0 says whether the
 * rate itself is 8- or 16-bit.
 * https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/
 */
function parseHeartRate(value: DataView | null): number | null {
  if (!value || value.byteLength < 2) return null;
  const is16Bit = value.getUint8(0) & 0x01;
  if (is16Bit && value.byteLength < 3) return null;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

/**
 * Waits for one notification from the characteristic. Whatever happens —
 * reading, timeout, or a failure to subscribe at all — the listener is removed
 * and notifications are stopped, so a cancelled read leaves nothing running.
 */
function readOneMeasurement(characteristic: BluetoothRemoteGATTCharacteristic): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      characteristic.removeEventListener('characteristicvaluechanged', handler);
      characteristic.stopNotifications().catch(() => {});
      fn();
    };

    const timeout = setTimeout(
      () => finish(() => reject(new Error('No reading received within 10 seconds'))),
      READ_TIMEOUT_MS,
    );

    const handler = function (this: BluetoothRemoteGATTCharacteristic) {
      const bpm = parseHeartRate(this.value);
      // A malformed packet is not fatal; wait for the next notification.
      if (bpm === null) return;
      finish(() => resolve(bpm));
    };

    characteristic.addEventListener('characteristicvaluechanged', handler);
    characteristic.startNotifications().catch(e => finish(() => reject(e)));
  });
}

const subscribeNever = () => () => {};
const hasBluetooth = () => navigator.bluetooth != null;

export function useHeartRate() {
  const [state, setState] = useState<HeartRateState>({ status: 'idle' });

  // Whether the browser has Web Bluetooth is a fact about the client, not
  // state: the server snapshot is false so prerender and hydration agree, and
  // the real answer arrives with the first client render. It never changes
  // afterwards, so there is nothing to subscribe to.
  const isSupported = useSyncExternalStore(subscribeNever, hasBluetooth, () => false);

  const read = useCallback(async (): Promise<number | null> => {
    if (!isSupported || !navigator.bluetooth) return null;

    setState({ status: 'connecting' });

    // Held outside the try so the connection can be closed on every exit path.
    // Leaving it open kept the strap bonded and notifying after a failed read.
    let server: BluetoothRemoteGATTServer | null = null;

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });

      if (!device.gatt) throw new Error('Device has no GATT server');

      server = await device.gatt.connect();

      setState({ status: 'reading' });

      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      const bpm = await readOneMeasurement(characteristic);

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
    } finally {
      if (server?.connected) server.disconnect();
    }
  }, [isSupported]);

  const clearError = useCallback(() => setState({ status: 'idle' }), []);

  return { read, state, isSupported, clearError };
}
