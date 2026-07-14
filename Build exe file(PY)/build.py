import os
import sys
import subprocess

def create_exe():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # لیست فایل‌هایی که باید بررسی و بسته‌بندی شوند
    files_to_pack = []
    
    # ۱. بررسی فایل index.html
    html_path = os.path.join(base_dir, 'index.html')
    if os.path.exists(html_path):
        files_to_pack.append(f'--add-data=index.html{os.pathsep}.')
    else:
        print("❌ خطا: فایل index.html پیدا نشد!")
        return

    # ۲. بررسی فایل custom.css (پیدا کردن مسیر دقیق آن)
    css_paths = [
        os.path.join(base_dir, 'custom.css'),
        os.path.join(base_dir, 'static', 'custom.css'),
        os.path.join(base_dir, 'static', 'css', 'custom.css')
    ]
    css_found = False
    for path in css_paths:
        if os.path.exists(path):
            # محاسبه مسیر نسبی نسبت به ریشه پروژه برای PyInstaller
            rel_path = os.path.relpath(path, base_dir)
            # انتقال به ریشه فایل اجرایی یا پوشه استاتیک
            dest = 'static/css' if 'static' in rel_path else '.'
            files_to_pack.append(f'--add-data={rel_path}{os.pathsep}{dest}')
            css_found = True
            print(f"✔️ فایل CSS در مسیر روبرو پیدا شد: {rel_path}")
            break
            
    if not css_found:
        print("❌ خطا: فایل custom.css در هیچ‌کدام از پوشه‌های پروژه پیدا نشد!")
        return

    # ۳. بررسی فایل main.js (پیدا کردن مسیر دقیق آن)
    js_paths = [
        os.path.join(base_dir, 'main.js'),
        os.path.join(base_dir, 'static', 'main.js'),
        os.path.join(base_dir, 'static', 'js', 'main.js')
    ]
    js_found = False
    for path in js_paths:
        if os.path.exists(path):
            rel_path = os.path.relpath(path, base_dir)
            dest = 'static/js' if 'static' in rel_path else '.'
            files_to_pack.append(f'--add-data={rel_path}{os.pathsep}{dest}')
            js_found = True
            print(f"✔️ فایل JS در مسیر روبرو پیدا شد: {rel_path}")
            break
            
    if not js_found:
        print("❌ خطا: فایل main.js پیدا نشد!")
        return

    # ۴. اضافه کردن پوشه static در صورت وجود (برای فایل‌های آفلاین دانلود شده)
    static_dir = os.path.join(base_dir, 'static')
    if os.path.exists(static_dir):
        files_to_pack.append(f'--add-data=static{os.pathsep}static')
        print("✔️ پوشه فایل‌های استاتیک آفلاین (static) به بسته اضافه شد.")

    # ساخت دستور نهایی PyInstaller
    command = [
        "pyinstaller",
        "--name=FlybackDesigner",
        "--onefile",
        "--noconsole",
    ] + files_to_pack + ["app.py"]

    print("\n🚀 در حال ساخت فایل اجرایی... لطفا منتظر بمانید.")
    print("اجرای دستور:")
    print(" ".join(command))
    print("-" * 50)
    
    try:
        subprocess.run(command, check=True)
        print("\n🎉 تبریک! فایل اجرایی با موفقیت ساخته شد.")
        print(f"📁 فایل EXE نهایی در پوشه روبرو قرار دارد: {os.path.join(base_dir, 'dist')}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ ساخت فایل با خطا مواجه شد: {e}")

if __name__ == '__main__':
    create_exe()