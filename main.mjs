import * as PST from "./src/index.js";
import fs from "fs";
import path from "path";
import minimist from "minimist";
import { promisify } from "util";

const open = promisify(fs.open);
const read = promisify(fs.read);
const close = promisify(fs.close);

const args = minimist(process.argv.slice(2));

// Thêm xử lý cho cờ --help
if (args['help'] !== undefined) {
	// --lg: Cờ đọc các file lớn hơn 3GB (Pending)
    console.warn(`
---------------------------------------------------------
Hướng dẫn sử dụng:
--rm: Xóa 2 folders PSTOutput và ErrorLog trước khi tạo log mới, mặc định là false
--dir=<tên folder>: Đọc folder PST được chỉ định thay vì PSTFolder
--rt: Thử lại các file bị lỗi trong folder ErrorLog, mặc định là false
    Lưu ý: cờ này không thể dùng chung với cờ --dir và --rm
---------------------------------------------------------
    `);
process.exit(0);
}
const shouldRemove = args['rm'] !== undefined;
const shouldRetry = args['rt'] !== undefined;
const testFolder = args['dir'] !== undefined && !shouldRetry ? args['dir'] : 'PSTFolder';
const baseFolder = "./main";
const PSTFolder = testFolder ? path.join(baseFolder, testFolder) : path.join(baseFolder, "PSTFolder");
const PSTOutput = path.join(baseFolder, "PSTOutput");
const ErrorLog = path.join(baseFolder, "ErrorLog");
const useLargeFileMode = args['lg'] !== undefined;

// Đảm bảo các thư mục cần thiết tồn tại
if (shouldRemove && !shouldRetry) {
    [PSTOutput, ErrorLog].forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        fs.mkdirSync(dir, { recursive: true });
    });
} else {
    [PSTOutput, ErrorLog].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Xử lý file PST
async function processPSTFiles() {
    let pstFiles;
    if (shouldRetry) {
        // Đọc các file lỗi từ ErrorLog
        const errorFiles = fs.readdirSync(ErrorLog).filter(file => path.extname(file) === '.txt');
        const errorPstFiles = errorFiles.map(file => path.basename(file, '.txt') + '.pst');
        
        // Lọc ra các file PST trong PSTFolder mà có trong danh sách lỗi
        pstFiles = fs.readdirSync(PSTFolder)
            .filter(file => path.extname(file).toLowerCase() === '.pst' && errorPstFiles.includes(file));
        console.warn("----------Retry mode is running----------");

        // Xóa tất cả các file trong ErrorLog
        fs.readdirSync(ErrorLog).forEach(file => {
            fs.unlinkSync(path.join(ErrorLog, file));
        });
    } else {
        // Đọc tất cả các file PST trong thư mục PSTFolder
        pstFiles = fs.readdirSync(PSTFolder).filter(file => path.extname(file).toLowerCase() === '.pst');
    }
    
    const totalFiles = pstFiles.length;

    for (let index = 0; index < pstFiles.length; index++) {
        const file = pstFiles[index];
        const currentFile = index + 1;
        console.log(`Processing file ${currentFile}/${totalFiles}: ${file}`);
        await processPSTFile(file, currentFile, totalFiles);
    }

    // Đọc các file lỗi từ ErrorLog
    const errorFilesLength = fs.readdirSync(ErrorLog).filter(file => path.extname(file) === '.txt').length;
    if (shouldRetry) {
        console.log(`Completed retrying the Error Folder: ${errorFilesLength}/${totalFiles} error(s) remaining.`);
    }
    else
    {
        console.log(`Finished reading the PST folder: ${errorFilesLength}/${totalFiles} error(s) found.`);
    }
}

// Thử xử lý các file PST
try {
    processPSTFiles();
} catch(error) {
    console.error(`Error occurred: ${error.message}`);
}

async function processPSTFile(filename, currentFile, totalFiles) {
    const pstFilePath = path.join(PSTFolder, filename);
    let outputFolder = path.join(PSTOutput, path.basename(filename, '.pst'));

    // Kiểm tra và thêm số nếu thư mục đã tồn tại
    outputFolder = getUniqueFolderName(outputFolder);

    const attachmentsFolder = path.join(outputFolder, 'Attachments');
    const mailContentsFolder = path.join(outputFolder, 'MailContents');
    const outputFilename = path.join(outputFolder, `${path.basename(filename, '.pst')}.txt`);

    try {
        // Đảm bảo thư mục đầu ra và thư mục đính kèm tồn tại
        [outputFolder, attachmentsFolder, mailContentsFolder].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        let pst;
        if (useLargeFileMode) {
            const pstData = await readPSTAsStream(pstFilePath);
            pst = new PST.PSTFile(pstData.buffer);
        } else {
            const byteBuffer = await readLargeFile(pstFilePath);
            pst = new PST.PSTFile(byteBuffer.buffer);
        }

        const messageStore = pst.getMessageStore();

        if (!messageStore) {
            throw new Error("Cannot find MessageStore");
        }

        let output = "";

        if (messageStore.rootFolderNID) {
            output += printFolderTree(pst, messageStore.rootFolderNID, 0, attachmentsFolder, mailContentsFolder);
        }

        fs.writeFileSync(outputFilename, output);
        console.log(`Logging successfully: ${filename}\n`);
    } catch (e) {
        fs.rmSync(outputFolder, { recursive: true, force: true });
        const errorLogFile = path.join(ErrorLog, `${path.basename(filename, '.pst')}.txt`);
        fs.writeFileSync(errorLogFile, `Error processing ${filename}: ${e.message}\n${e.stack}`);
        console.error(`Error occurred in file ${currentFile}/${totalFiles}: ${filename}\n`);
    }
}

async function readLargeFile(filePath) {
    const fd = await open(filePath, 'r');
    const stats = await fs.promises.stat(filePath);
    const fileSize = stats.size;
    const bufferSize = 1024 * 1024 * 1024; // 1GB
    let buffer = Buffer.alloc(fileSize);
    let bytesRead = 0;
    let position = 0;
    
    try {
        while (position < fileSize) {
            const result = await read(fd, buffer, position, Math.min(bufferSize, fileSize - position), position);
            if (result.bytesRead === 0) break;
            
            position += result.bytesRead;
            bytesRead += result.bytesRead;
        }
    } finally {
        await close(fd);
    }

    return buffer.slice(0, bytesRead);
}

// Hàm mới để đọc file PST theo stream
async function readPSTAsStream(filePath) {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath);
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

function printFolderTree(pst, nid, depth, attachmentsFolder, mailContentsFolder) {
    let output = "";
    try {
        const folder = pst.getFolder(nid);
        if (folder) {
            output += `${" |  ".repeat(depth)}- ${folder.displayName}\n`;

            // Print messages in this folder
            const messages = folder.getContents();
            for (const message of messages) {
                if(message.sentRepresentingName == "" && message.subject == "")
                    continue;

                output += `${" |  ".repeat(depth+1)}- Sender: ${message.sentRepresentingName}, Subject: ${message.subject}\n`;
                
                //Print attachments if any
                const messageData = pst.getMessage(message.nid);

                //Ghi nội dung dung vào file
                if(messageData.body != "")
                {
                    const sanitizedSubject = sanitizeFilename(message.subject).slice(0, 200);
                    const mailContentFilename = path.join(mailContentsFolder, `${sanitizedSubject}.txt`);
                    try {
                        fs.writeFileSync(mailContentFilename, messageData.body);
                    } catch (error) {
                        fs.writeFileSync(mailContentFilename, error.message);
                    }
                }

                if (messageData.hasAttachments) {
                    const attachments = messageData.getAttachmentEntries();
                    for (let i = 0; i < attachments.length; i++) {
                        try {
                            const attachmentData = messageData.getAttachment(i);
                            if (attachmentData) {
                                const filePath = path.join(attachmentsFolder, attachmentData.displayName);
                                fs.writeFileSync(filePath, Buffer.from(attachmentData.attachDataBinary));
                                output += `${" |  ".repeat(depth + 2)}- Attachment: ${attachmentData.displayName}, Size: ${attachmentData.attachSize} bytes\n`;
                            }
                        } catch (error) {
                            output += `${" |  ".repeat(depth + 2)}- Error processing attachment: ${error.message}\n`;
                        }
                    }
                }
            }

            // Recursively print subfolders
            const subfolders = folder.getSubFolderEntries();
            for (const sf of subfolders) {
                try {
                    output += printFolderTree(pst, sf.nid, depth + 1, attachmentsFolder, mailContentsFolder);
                } catch (e) {
                    output += `${" |  ".repeat(depth + 1)}- Error processing subfolder: ${e.message}\n`;
                    console.warn(`Error processing subfolder with NID ${sf.nid}: ${e.message}`);
                    continue;
                }
            }
        }
    } catch (e) {
        if (e.message.includes("XXBlock")) {
            output += `${" |  ".repeat(depth)}- Skipping XXBlock: ${e.message}\n`;
            console.warn(`Skipping XXBlock for NID ${nid}: ${e.message}`);
        } else {
            output += `${" |  ".repeat(depth)}- Error processing folder: ${e.message}\n`;
            console.error(`Error processing folder with NID ${nid}: ${e.message}`);
        }
    }
    return output;
}

function sanitizeFilename(filename) {
    // Loại bỏ emoji và các ký tự đặc biệt
    let sanitized = filename
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // loại bỏ emoji
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // loại bỏ các biểu tượng và pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // loại bỏ các biểu tượng vận tải và bản đồ
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // loại bỏ các ký hiệu khác
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')  // loại bỏ ký tự không hợp lệ cho tên file Windows
        .replace(/^\.+/, '')                    // loại bỏ dấu chấm ở đầu
        .replace(/\s+/g, '_')                   // thay thế khoảng trắng bằng dấu gạch dưới
        .replace(/[']/g, '')                    // loại bỏ dấu nháy đơn
        .trim();

    // Giới hạn độ dài
    sanitized = sanitized.slice(0, 200);

    // Nếu tên file rỗng sau khi xử lý, sử dụng tên mặc định
    return sanitized || 'Unnamed_File';
}

// Hàm để kiểm tra thư mục và thêm số nếu cần thiết
function getUniqueFolderName(baseFolder) {
    let folder = baseFolder;
    let counter = 1;

    while (fs.existsSync(folder)) {
        folder = `${baseFolder} (${counter})`;
        counter++;
    }

    return folder;
}