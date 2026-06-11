// Minimal Web Bluetooth API declarations (not yet in TypeScript's DOM lib)
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly value: DataView | null;
  startNotifications(): Promise<this>;
  stopNotifications(): Promise<this>;
  readValue(): Promise<DataView>;
  addEventListener(type: 'characteristicvaluechanged', listener: (this: this, ev: Event) => void): void;
  removeEventListener(type: 'characteristicvaluechanged', listener: (this: this, ev: Event) => void): void;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean;
  connect(): Promise<this>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice {
  readonly gatt: BluetoothRemoteGATTServer | undefined;
}

interface Bluetooth {
  requestDevice(options: {
    filters?: Array<{ services?: string[]; name?: string }>;
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }): Promise<BluetoothDevice>;
}

interface Navigator {
  readonly bluetooth: Bluetooth | undefined;
}
