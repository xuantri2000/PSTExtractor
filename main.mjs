import * as PST from "./src/index.js";
import fs from "fs";
import path from "path";
import minimist from "minimist";

const args = minimist(process.argv.slice(2));
const shouldRemove = args['rm'] !== undefined;
const shouldRetry = args['rt'] !== undefined;
const testFolder = args['dir'] !== undefined && !shouldRetry ? args['dir'] : 'PSTFolder';
const baseFolder = "./main";
const PSTFolder = testFolder ? path.join(baseFolder, testFolder) : path.join(baseFolder, "PSTFolder");
const PSTOutput = path.join(baseFolder, "PSTOutput");
const ErrorLog = path.join(baseFolder, "ErrorLog");

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
function processPSTFiles() {
    let pstFiles;
	if (shouldRetry) {
		// Đọc các file lỗi từ ErrorLog
		const errorFiles = fs.readdirSync(ErrorLog).filter(file => path.extname(file) === '.txt');
		const errorPstFiles = errorFiles.map(file => path.basename(file, '.txt') + '.pst');
		
		// Lọc ra các file PST trong PSTFolder mà có trong danh sách lỗi
		pstFiles = fs.readdirSync(PSTFolder)
			.filter(file => path.extname(file).toLowerCase() === '.pst' && errorPstFiles.includes(file));
		console.log("Retry mode is running...");

		// Xóa tất cả các file trong ErrorLog
		fs.readdirSync(ErrorLog).forEach(file => {
			fs.unlinkSync(path.join(ErrorLog, file));
		});
	} else {
		// Đọc tất cả các file PST trong thư mục PSTFolder
		pstFiles = fs.readdirSync(PSTFolder).filter(file => path.extname(file).toLowerCase() === '.pst');
	}
	
    const totalFiles = pstFiles.length;

    pstFiles.forEach((file, index) => {
        const currentFile = index + 1;
        console.log(`Processing file ${currentFile}/${totalFiles}: ${file}`);
        processPSTFile(file, currentFile, totalFiles);
    });
}

// Thử xử lý các file PST
try {
    processPSTFiles();
} catch(error) {
    console.log(`Error occurred: ${error.message}`);
}

function processPSTFile(filename, currentFile, totalFiles) {
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

        // Sử dụng stream để đọc file
        const fileStream = fs.createReadStream(pstFilePath);
        const chunks = [];

        fileStream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        fileStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const pst = new PST.PSTFile(buffer.buffer);
            const messageStore = pst.getMessageStore();

            if (!messageStore) {
                throw new Error("Cannot find MessageStore");
            }

            let output = "";

            if (messageStore.rootFolderNID) {
                output += printFolderTree(pst, messageStore.rootFolderNID, 0, attachmentsFolder, mailContentsFolder);
            }

            fs.writeFileSync(outputFilename, output);
        });

        fileStream.on('error', (error) => {
            throw error;
        });
    } catch (e) {
        const errorLogFile = path.join(ErrorLog, `${path.basename(filename, '.pst')}.txt`);
        fs.writeFileSync(errorLogFile, `Error processing ${filename}: ${e.message}\n${e.stack}`);
        console.log(`Error occurred in file ${currentFile}/${totalFiles}: ${filename}`);
    }
}

function printFolderTree(pst, nid, depth, attachmentsFolder, mailContentsFolder) {
    let output = "";
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
			output += printFolderTree(pst, sf.nid, depth + 1, attachmentsFolder, mailContentsFolder);
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