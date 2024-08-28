import fs from "fs";
import path from "path";

export async function countFilesByExtension(rootFolder) {
    const totalFileCounts = {};
    const folderResults = [];

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

    function findAndCountAttachments(folder) {
        const items = fs.readdirSync(folder);

        for (const item of items) {
            const itemPath = path.join(folder, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                if (item === 'Attachments') {
                    const parentFolderName = path.basename(folder);
                    const attachmentCounts = countFilesInAttachments(itemPath);
                    folderResults.push({
                        folderName: parentFolderName,
                        counts: attachmentCounts
                    });
                } else {
                    findAndCountAttachments(itemPath);
                }
            }
        }
    }

    const analysFolderPath = path.join("./", "Analys");

    if (fs.existsSync(analysFolderPath)) {
        fs.rmSync(analysFolderPath, { recursive: true, force: true });
    }

    fs.mkdirSync(analysFolderPath, { recursive: true });

    findAndCountAttachments(rootFolder);

    let fileCounter = 1;

    // Ghi kết quả cho từng thư mục con chứa attachments
    for (const result of folderResults) {
        const folderSummary = Object.entries(result.counts)
            .sort(([extA], [extB]) => extA.localeCompare(extB))
            .map(([extension, count]) => `Định dạng ${extension}: ${count} files`)
            .join('\n');

        const fileName = `${fileCounter}. ${result.folderName}.txt`;
        fs.writeFileSync(path.join(analysFolderPath, fileName), folderSummary, { flag: 'w' });
        fileCounter++;
    }

    // Ghi tổng kết chung
    const totalSummary = Object.entries(totalFileCounts)
        .sort(([extA], [extB]) => extA.localeCompare(extB))
        .map(([extension, count]) => `Định dạng ${extension}: ${count} files`)
        .join('\n');

    const summaryFileName = `${fileCounter}. Summary.txt`;
    fs.writeFileSync(path.join(analysFolderPath, summaryFileName), totalSummary, { flag: 'w' });
    console.log("Kết quả đã được ghi vào thư mục Analys.");
}