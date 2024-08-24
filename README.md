# PST Extractor
Sử dụng để đọc hàng loạt file Outlook PST và lấy ra tệp đính kèm.
Được tham khảo từ [@calvin-commer/pst-parser](https://www.npmjs.com/package/@calvin-coomer/pst-parser?activeTab=readme)

## Môi trường

1. Tải và cài đặt Node.js tại [Node.js Official Website](https://nodejs.org/en).
- Sau khi cài đặt xong, chạy cmd để kiểm tra version và biến môi trường node có chưa, đảm bảo là phiên bản mới, hiện tại đang là node v20 LTS:
     ```bash
   node -v
   npm -v
- Nếu chưa có git thì tải tại [Git Offical Website](https://git-scm.com/downloads).
2. Clone source về máy bằng lệnh:
   ```bash
   git clone https://github.com/xuantri2000/PSTExtractor.git

3. Khởi tạo package:
     ```bash
   npm install

## Chạy file JS
0. Log sẽ được tạo ra trong thư mục /main.
1. Copy toàn bộ file PST vào thư mục **PSTFolder**. Toàn bộ output sẽ được lưu vào thư mục **PSTOutput**.
2. Tham số:
- **--dir=<đường dẫn đọc file PST>** (mặc định là PSTFolder)
- **--rm** (cờ để xóa PSTOutput trước khi chạy, mặc định là false)
- **--rt** (cờ để chạy lại những file PST đã lỗi trước đó trong folder **ErrorLog**, mặc định là false. Khi cờ này được bật, **--dir** sẽ đọc mặc định ở **PSTFolder**, **--rm** sẽ là false)
<!-- - **--lg** (cờ để chạy với mode đọc file lớn hơn 3GB theo Stream, thời gian sẽ lâu hơn bình thường, nên dùng chung với cờ --rt để target vào các file lỗi) -->
- **--help** (cờ để mở hướng dẫn sử dụng)
3. Mở Command Prompt (CMD) và chạy lệnh:

   ```bash
   npm start
- Câu lệnh này sẽ đọc file PST ở thư mục **PSTFolder**, không xóa log cũ ở **PSTOutput**.
- Nếu chỉ cần test 1 hoặc 2 file .pst (trong trường hợp file bị lỗi), copy chúng vào một thư mục cùng cấp và chạy lệnh:

   ```bash
   npm start -- --dir=<thư mục vừa tạo>

- Ví dụ, khi cần test file abc.pst, tạo một thư mục tên test và copy file đó vào, sau đó chạy lệnh:

   ```bash
   npm start -- --dir=test
   
- Trường hợp muốn đọc pst ở folder test xóa đi log ở PSTOutput:
   ```bash
   npm start -- --dir=test --rm
- Trường hợp muốn retry những file đã bị lỗi trước đó ở ErrorLog:
   ```bash
   npm start -- --rt
- Khi chạy đủ 3 arguments như câu lệnh dưới đây, 2 argument --dir và --rm sẽ bị vô hiệu hóa và đọc giá trị mặc định để tiến hành retry ở folder **ErrorLog**:
  ```bash
  npm start -- --dir=test --rm --rt

3. Trong PSTOutput có:
- File ghi lại toàn bộ nội dung của tệp PST.
- Folder MailContents chứa nội dung của toàn bộ email đã gửi và nhận, thư rác, thư nháp,...
- Folder Attachments chứa toàn bộ tệp đính kèm từ email. Vì một số lý do liên quan đến encode, nên file .word, .pptx mở lên bị lỗi encode cần phải xác nhận OK để bật.

4. Thư mục ErrorLog sẽ bị truncate trước khi chạy và ghi log những file xuất hiện lỗi.
5. Trường hợp muốn phát triển thêm chức năng, tham khảo file test.js hoặc đọc file JS core trong folder ./src.
- Logic chỉnh sửa chủ yếu là từ PSTInternal.js.
- XXBlock bao gồm nhiều tập hợp XBlock, XBlock bao gồm nhiều DataBlock, Datablock chính là class chứa thông tin của Mail, XXBlock thường xuất hiện ở các file lớn.
- SubnodeIntermediateBlock bao gồm nhiều tập hợp SubnodeLeafBlock, logic #getSubNodeAccessor(bidSub) getSubEntry được chỉnh sửa để bổ sung thêm 1 vòng lặp lớn tìm kiếm internalNid.
