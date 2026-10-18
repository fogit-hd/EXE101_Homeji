# Login với dải ảnh nhà chuyển động

Tham chiếu đã xem trực tiếp https://gamma.app/signin: form bên trái, Google phía trên email, cột ảnh nghiêng bên phải. Homeji dùng palette và ảnh có sẵn, không thêm Apple/SSO khi chưa có backend.

AuthHomeGallery dùng ba track CSS lặp hai bản sao giống nhau, chu kỳ 100/120/110 giây, không requestAnimationFrame liên tục bằng JS; hình không phải tin cho thuê. Cho phép tạm dừng, dừng khi tab ẩn và tôn trọng reduced-motion. Desktop 48/52; mobile form trước, ảnh ở cuối; ảnh không cản nhập liệu. Login giữ API, Google, chuyển đăng ký, OTP và quên mật khẩu; thêm hiện/ẩn mật khẩu. Đăng ký với nhân vật 3D giữ riêng.

Build và ESLint module mới qua. auth-login-gallery.e2e.mjs kiểm tra ảnh load, chuyển động tự chạy, pause, reduced-motion, sáng/tối ở 1440/1024/768/390/320px, payload đăng nhập và phản hồi lỗi bằng fixture, điều hướng recovery/đăng ký. Google thực đã hiển thị trong trình duyệt local; không thực hiện đăng nhập OAuth lại trong bài test.
