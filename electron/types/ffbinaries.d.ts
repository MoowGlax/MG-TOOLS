declare module 'ffbinaries' {
    interface DownloadOptions {
        destination?: string;
        platform?: string;
        quiet?: boolean;
        force?: boolean;
    }

    export function downloadBinaries(
        components: string[],
        options: DownloadOptions,
        callback: (err?: Error, data?: any) => void
    ): void;
}
