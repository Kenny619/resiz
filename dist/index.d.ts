type inputOptions = {
    source: string;
    destination?: string;
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
};
declare class Resiz {
    #private;
    constructor();
    run(option: inputOptions): Promise<void>;
    workerWrapper(file: string): Promise<void>;
    resizeSingleFile(filePath: string): Promise<void>;
}
declare const resiz: Resiz;
export default resiz;
