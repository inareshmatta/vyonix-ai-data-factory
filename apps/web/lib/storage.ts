import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';

// Production Environment Check
const IS_CLOUD = process.env.NODE_ENV === 'production' || !!process.env.K_SERVICE || !!process.env.PORT;

const STORAGE_ROOT = IS_CLOUD
    ? path.join('/tmp', 'jobs')
    : path.join(process.cwd(), '..', '..', 'data', 'jobs');

// Ensure storage root exists
if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export interface JobMetadata {
    id: string;
    originalName: string;
    timestamp: string;
    status: 'completed' | 'failed';
    tokenUsage?: {
        input: number;
        output: number;
        total: number;
    };
    durationMs: number;
    duration?: string; // Formatted HH:MM:SS
}

const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const JobStorage = {
    saveJob: async (
        audioBuffer: Buffer,
        fileName: string,
        transcription: any[],
        metadata: Partial<JobMetadata>
    ) => {
        const jobId = uuidv4();
        const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, ""); // Remove extension
        const jobDir = path.join(STORAGE_ROOT, `${safeName}_${jobId}`);

        // 1. Create Job Directory
        await fs.promises.mkdir(jobDir, { recursive: true });

        // 2. Save Audio File
        const audioPath = path.join(jobDir, fileName);
        await fs.promises.writeFile(audioPath, audioBuffer);

        // 3. Save JSON
        const jsonPath = path.join(jobDir, `${safeName}.json`);
        await fs.promises.writeFile(jsonPath, JSON.stringify(transcription, null, 2));

        // 4. Save CSV
        const csvPath = path.join(jobDir, `${safeName}.csv`);
        const csvHeader = "id,start,end,speaker,word,type\n";
        const csvRows = transcription.map((t: any) =>
            `${t.id},${t.start},${t.end},"${t.speaker}","${t.word}","${t.type}"`
        ).join('\n');
        await fs.promises.writeFile(csvPath, csvHeader + csvRows);

        // 5. Create Log File
        const logPath = path.join(jobDir, 'job_log.txt');
        const durationFormatted = formatDuration(metadata.durationMs || 0);

        const logContent = `
Job ID: ${jobId}
Date: ${new Date().toISOString()}
File: ${fileName}
Duration: ${durationFormatted} (${metadata.durationMs || 0}ms)
Status: ${metadata.status}
Token Usage:
  Input: ${metadata.tokenUsage?.input || 'N/A'}
  Output: ${metadata.tokenUsage?.output || 'N/A'}
  Total: ${metadata.tokenUsage?.total || 'N/A'}
        `.trim();
        await fs.promises.writeFile(logPath, logContent);

        // 6. Create ZIP (Audio, JSON) - CSV removed
        const zipPath = path.join(jobDir, `${safeName}.zip`);
        await new Promise<void>((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);
            archive.file(audioPath, { name: fileName });
            archive.file(jsonPath, { name: `${safeName}.json` });
            // archive.file(csvPath, { name: `${safeName}.csv` }); // Removed per user request
            archive.finalize();
        });

        // 7. Save Index/Metadata
        const indexEntry: JobMetadata = {
            id: jobId,
            originalName: fileName,
            timestamp: new Date().toISOString(),
            status: 'completed',
            tokenUsage: metadata.tokenUsage,
            durationMs: metadata.durationMs || 0,
            duration: durationFormatted
        };

        // Append to history index
        const historyPath = path.join(STORAGE_ROOT, 'history.json');
        let history = [];
        if (fs.existsSync(historyPath)) {
            history = JSON.parse(await fs.promises.readFile(historyPath, 'utf-8'));
        }
        history.unshift(indexEntry);
        await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2));


        return { jobId, jobDir, zipPath };
    },

    getHistory: async () => {
        const historyPath = path.join(STORAGE_ROOT, 'history.json');
        if (!fs.existsSync(historyPath)) return [];
        try {
            const content = await fs.promises.readFile(historyPath, 'utf-8');
            if (!content.trim()) return [];
            return JSON.parse(content);
        } catch (e) {
            console.error("Error reading history.json:", e);
            return [];
        }
    }
};
