import fs from "fs";
import path from "path";

export async function countFilesByExtension(rootFolder) {
    const totalFileCounts = {};

    function countFilesInAttachments(folderPath) {
        const fileCounts = {};
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isFile()) {
                const extension = path.extname(file).toLowerCase();
                fileCounts[extension] = (fileCounts[extension] || 0) + 1;
                totalFileCounts[extension] = (totalFileCounts[extension] || 0) + 1;
            } else if (stats.isDirectory()) {
                const subCounts = countFilesInAttachments(filePath);
                Object.entries(subCounts).forEach(([ext, count]) => {
                    fileCounts[ext] = (fileCounts[ext] || 0) + count;
                });
            }
        });
        return fileCounts;
    }

    const analysFolderPath = path.join("./", "Analys");

    if (fs.existsSync(analysFolderPath)) {
        fs.rmSync(analysFolderPath, { recursive: true, force: true });
    }

    fs.mkdirSync(analysFolderPath, { recursive: true });

    const folders = fs.readdirSync(rootFolder).filter(folder => {
        const attachmentsPath = path.join(rootFolder, folder, 'attachments');
        return fs.existsSync(attachmentsPath) && fs.statSync(attachmentsPath).isDirectory();
    });

    let fileCounter = 1;

    for (const folder of folders) {
        const attachmentsPath = path.join(rootFolder, folder, 'attachments');
        const folderCounts = countFilesInAttachments(attachmentsPath);

        const folderSummary = Object.entries(folderCounts)
            .sort(([extA], [extB]) => extA.localeCompare(extB))
            .map(([extension, count]) => `Định dạng ${extension}: ${count} files`)
            .join('\n');

        const fileName = `${fileCounter}. ${folder}.txt`;
        fs.writeFileSync(path.join(analysFolderPath, fileName), folderSummary, { flag: 'w' });
        fileCounter++;
    }

    const totalSummary = Object.entries(totalFileCounts)
        .sort(([extA], [extB]) => extA.localeCompare(extB))
        .map(([extension, count]) => `Định dạng ${extension}: ${count} files`)
        .join('\n');

    const summaryFileName = `${fileCounter}. Summary.txt`;
    fs.writeFileSync(path.join(analysFolderPath, summaryFileName), totalSummary, { flag: 'w' });
    console.log("Kết quả đã được ghi vào thư mục Analys.");
}