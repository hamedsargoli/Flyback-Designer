# -*- coding: utf-8 -*-
# ==============================================================================
#  Flyback Transformer Design Suite
#  File     : app.py — Flask Web Server & API Layer
#  Version  : 1.0
#  Author   : Hamed Sargoli
#  Date     : 2026-07-14
#  Developed with AI collaboration
# ==============================================================================
"""
Flyback Transformer Engineering Suite - Flask Server
Handles routing and modular API calculations for offline AC-DC, DC-DC, and battery chargers.
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
import sys
import os
import webbrowser
import threading

app = Flask(__name__)

# ------------------------------------------------------------------------------
# Base path resolution
# پیدا کردن مسیر ریشه پروژه (سازگار با اجرای معمولی و فایل EXE ساخته شده با PyInstaller)
# ------------------------------------------------------------------------------
if getattr(sys, 'frozen', False):
    # اگر برنامه به صورت فایل اجرایی درآمده باشد، فایل‌ها در این پوشه موقت اکسترکت می‌شوند
    BASE_DIR = sys._MEIPASS
else:
    # اگر برنامه به صورت اسکریپت پایتون اجرا شود
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# تنظیم پوشه قالب‌ها به ریشه اصلی
app.template_folder = BASE_DIR

# ------------------------------------------------------------------------------
# Static file routes (CSS / JS)
# تعریف مسیرهای سفارشی برای پیدا کردن و لود کردن فایل‌های استاتیک
# ------------------------------------------------------------------------------
@app.route('/static/css/custom.css')
@app.route('/static/custom.css')
@app.route('/custom.css')
def serve_css():
    paths_to_check = [
        os.path.join(BASE_DIR, 'static', 'css', 'custom.css'),
        os.path.join(BASE_DIR, 'static', 'custom.css'),
        os.path.join(BASE_DIR, 'custom.css')
    ]
    for path in paths_to_check:
        if os.path.exists(path):
            return send_from_directory(os.path.dirname(path), os.path.basename(path), mimetype='text/css')
    return "CSS file not found", 404

@app.route('/static/js/main.js')
@app.route('/static/main.js')
@app.route('/main.js')
def serve_js():
    paths_to_check = [
        os.path.join(BASE_DIR, 'static', 'js', 'main.js'),
        os.path.join(BASE_DIR, 'static', 'main.js'),
        os.path.join(BASE_DIR, 'main.js')
    ]
    for path in paths_to_check:
        if os.path.exists(path):
            return send_from_directory(os.path.dirname(path), os.path.basename(path), mimetype='application/javascript')
    return "JS file not found", 404

# بارگذاری موتور محاسباتی ترانسفورماتور
from flyback_engine import calculate_flyback

# ------------------------------------------------------------------------------
# Page routes
# ------------------------------------------------------------------------------
@app.route('/')
def index():
    """Renders the main unified calculator page."""
    return render_template('index.html')

# ------------------------------------------------------------------------------
# API: main calculation endpoint
# ------------------------------------------------------------------------------
@app.route('/api/calculate', methods=['POST'])
def api_calculate():
    """
    Receives JSON containing design inputs, performs validation and calculations 
    using the Python mathematical engine, and returns structured technical results.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No input data provided'}), 400
            
        tab = data.get('tab', 'acdc')
        inputs = data.get('inputs', {})
        
        # Run physical simulator calculations
        results = calculate_flyback(tab, inputs)
        return jsonify({'success': True, 'results': results})
        
    except Exception as e:
        # Prevent server crashes with secure error boundaries
        exc_type, exc_obj, exc_tb = sys.exc_info()
        fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
        error_msg = f"Calculation error: {str(e)} in {fname} at line {exc_tb.tb_lineno}"
        return jsonify({'success': False, 'error': error_msg}), 500

# ------------------------------------------------------------------------------
# API: local server shutdown
# ------------------------------------------------------------------------------
@app.route('/api/shutdown', methods=['POST'])
def shutdown():
    """Gracefully shuts down the local server when the browser is closed."""
    # ارسال سیگنال خروج از سرور با 0.5 ثانیه تاخیر جهت موفقیت آمیز بودن ارسال پاسخ
    threading.Timer(0.5, lambda: os._exit(0)).start()
    return jsonify({'success': True, 'message': 'Server is shutting down...'})

# ------------------------------------------------------------------------------
# Local browser launcher
# ------------------------------------------------------------------------------
def open_browser():
    """Opens the default web browser to the local server address."""
    webbrowser.open_new("http://127.0.0.1:5000")

# ------------------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------------------
if __name__ == '__main__':
    print("=" * 60)
    print(" Running Flyback Design Suite on http://127.0.0.1:5000")
    print("=" * 60)
    
    if not os.environ.get("WERKZEUG_RUN_MAIN"):
        threading.Timer(1.0, open_browser).start()
        
    app.run(debug=True, port=5000)
