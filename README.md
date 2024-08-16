# PST Extractor
Sử dụng để đọc hàng loạt file Outlook PST và lấy ra tệp đính kèm.
Được tham khảo từ [@calvin-commer/pst-parser](https://www.npmjs.com/package/@calvin-coomer/pst-parser?activeTab=readme)

## Môi trường

1. Tải và cài đặt Node.js tại [Node.js Official Website](https://nodejs.org/en).
- Sau khi cài đặt xong, chạy cmd để kiểm tra version và biến môi trường node có chưa:
     ```bash
   node -v
   npm -v
- Nếu chưa có git thì tải tại [Git Offical Website](https://git-scm.com/downloads).
2. Clone source về máy bằng lệnh:
   ```bash
   git clone https://github.com/xuantri2000/PSTExtractor.git

## Chạy file JS
0. Log sẽ được tạo ra trong thư mục /main.
1. Copy toàn bộ file PST vào thư mục PSTFolder. Toàn bộ output sẽ được lưu vào thư mục PSTOutput.
2. Mở Command Prompt (CMD) và chạy lệnh: 

   ```bash
   npm start

- Nếu chỉ cần test 1 hoặc 2 file .pst (trong trường hợp file bị lỗi), copy chúng vào một thư mục cùng cấp và chạy lệnh:

   ```bash
   npm start -- <tên_thư_mục_vừa_tạo>

- Ví dụ, khi cần test file abc.pst, tạo một thư mục tên test và copy file đó vào, sau đó chạy lệnh:

   ```bash
   npm start -- test

3. Trước khi chạy, toàn bộ log từ lần chạy trước đó trong PSTOutput sẽ bị truncate để tạo log mới. Trong PSTOutput có:
- File ghi lại toàn bộ nội dung của tệp PST.
- Folder MailContents chứa nội dung của toàn bộ email đã gửi và nhận, thư rác, thư nháp,...
- Folder Attachments chứa toàn bộ tệp đính kèm từ email. Vì một số lý do liên quan đến encode, nên file .word, .pptx mở lên bị lỗi encode cần phải xác nhận OK để bật.

4. Thư mục ErrorLog sẽ bị truncate trước khi chạy và ghi log những file xuất hiện lỗi.
5. Trường hợp muốn phát triển thêm chức năng, tham khảo file test.js hoặc đọc file JS core trong folder ./src.
