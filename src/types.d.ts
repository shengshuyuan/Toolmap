interface HTMLElement {
  _cleanup?: () => void;
  _qrStore?: {
    save(record: unknown): Promise<unknown>;
    list(): Promise<any[]>;
    remove(id: string): Promise<unknown>;
    clear(): Promise<unknown>;
  };
}

interface Window {
  PDFLib?: any;
  jsQR?: (...args: any[]) => any;
}
