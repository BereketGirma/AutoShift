export {};

type checkAndCreateFile = {
    status: string,
    filePath: string
};

declare global{
    interface Window {
        electron: {
            checkAndCreateFile: () => Promise<map>;
        };
    }
}
