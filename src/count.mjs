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

    function findAndCountAttachments(folder, parentFolders = []) {
        const items = fs.readdirSync(folder);

        for (const item of items) {
            const itemPath = path.join(folder, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                const newParentFolders = [...parentFolders, item];
                if (item === 'Attachments') {
                    const attachmentCounts = countFilesInAttachments(itemPath);
                    folderResults.push({
                        folderName: parentFolders[parentFolders.length - 1],
                        parentFolders: parentFolders.slice(0, -1),
                        counts: attachmentCounts
                    });
                } else {
                    findAndCountAttachments(itemPath, newParentFolders);
                }
            }
        }
    }

    const reportFolderPath = path.join("./", "Reports");

    if (fs.existsSync(reportFolderPath)) {
        fs.rmSync(reportFolderPath, { recursive: true, force: true });
    }

    fs.mkdirSync(reportFolderPath, { recursive: true });

    findAndCountAttachments(rootFolder);

    let fileCounter = 1;

    // Ghi kết quả cho từng thư mục con chứa attachments
    for (const result of folderResults) {
        const folderSummary = Object.entries(result.counts)
            .sort(([extA], [extB]) => extA.localeCompare(extB))
            .map(([extension, count]) => {
                if (extension === '') {
                    return `Không có định dạng: ${count} files`;
                } else {
                    return `Định dạng ${extension}: ${count} files`;
                }
            })
            .join('\n');

        const folderPath = path.join(reportFolderPath, ...result.parentFolders);
        fs.mkdirSync(folderPath, { recursive: true });

        let fileName;
        if (result.parentFolders.length > 1) {
            fileName = `${fileCounter}. ${result.parentFolders[result.parentFolders.length - 1]} ${result.folderName}.txt`;
        } else {
            fileName = `${fileCounter}. ${result.folderName}.txt`;
        }

        fs.writeFileSync(path.join(folderPath, fileName), folderSummary, { flag: 'w' });
        fileCounter++;
    }

    // Ghi tổng kết chung
    const totalSummary = Object.entries(totalFileCounts)
        .sort(([extA], [extB]) => extA.localeCompare(extB))
        .map(([extension, count]) => {
            if (extension === '') {
                return `Không có định dạng: ${count} files`;
            } else {
                return `Định dạng ${extension}: ${count} files`;
            }
        })
        .join('\n');

    const summaryFileName = `${fileCounter}. Summary.txt`;
    fs.writeFileSync(path.join(reportFolderPath, summaryFileName), totalSummary, { flag: 'w' });
    console.log("Kết quả đã được ghi vào thư mục Reports.");
}