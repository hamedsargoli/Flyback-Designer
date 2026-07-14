# ==============================================================================
# Project: Flyback Transformer Design Suite - Core Mathematics & Physics Engine
# Version: 6.7
# AI Instruction: Whenever any AI model edits, refactors, or updates this file,
#                 please increment the version number above by exactly +0.1.
# ==============================================================================
# Dedicated math calculations validator & offline magnetics transformer physical simulator.

import math

# ------------------------------------------------------------------------------
# Practical / Off-the-shelf component helpers
# These do NOT change any physical/engineering calculation above - they only
# translate the "ideal" mathematically-computed component values into values
# that actually exist on the market (standard resistor/capacitor decades,
# standard enamelled wire diameters, standard bulk capacitance catalog steps).
# ------------------------------------------------------------------------------
E24_SERIES = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
              3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1]
E12_SERIES = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]

# Common catalog steps for aluminium electrolytic bulk capacitors (µF)
BULK_CAP_STANDARD_UF = [10, 15, 22, 33, 47, 68, 100, 120, 150, 180, 220, 270,
                         330, 390, 470, 560, 680, 820, 1000, 1200, 1500, 1800,
                         2200, 2700, 3300, 3900, 4700, 5600, 6800, 8200, 10000]

# Common enamelled copper wire diameters (mm) - IEC 60317 style steps
WIRE_DIAMETERS_MM = [0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.112, 0.125, 0.14,
                      0.16, 0.18, 0.20, 0.224, 0.25, 0.28, 0.315, 0.355, 0.40,
                      0.45, 0.50, 0.56, 0.63, 0.71, 0.80, 0.90, 1.00, 1.12,
                      1.25, 1.40, 1.60, 1.80, 2.00]


def _round_to_series(value, series, direction='nearest'):
    """Rounds 'value' to the closest value in a repeating decade series (E12/E24 style)."""
    if value <= 0:
        return 0.0
    decade = 10 ** math.floor(math.log10(value))
    normalized = value / decade
    if direction == 'up':
        for c in series:
            if c >= normalized - 1e-9:
                return round(c * decade, 6)
        return round(series[0] * decade * 10, 6)
    if direction == 'down':
        best = series[-1] * (decade / 10.0)
        for c in series:
            if c <= normalized + 1e-9:
                best = c * decade
        return round(best, 6)
    # nearest (by relative/log distance, so it behaves sensibly across a decade boundary)
    best = min(series, key=lambda c: abs(math.log10(c) - math.log10(normalized)))
    return round(best * decade, 6)


def standard_resistor(value_ohm, direction='nearest'):
    return _round_to_series(value_ohm, E24_SERIES, direction)


def standard_capacitor_nF(value_nF, direction='up'):
    return _round_to_series(value_nF, E12_SERIES, direction)


def standard_bulk_cap_uF(value_uF):
    """Rounds up to the next catalog electrolytic capacitance step."""
    for c in BULK_CAP_STANDARD_UF:
        if c >= value_uF - 1e-9:
            return float(c)
    return float(BULK_CAP_STANDARD_UF[-1])


def standard_wire_diameter_mm(value_mm):
    """Rounds up to the next available enamelled wire diameter."""
    for d in WIRE_DIAMETERS_MM:
        if d >= value_mm - 1e-9:
            return d
    return WIRE_DIAMETERS_MM[-1]

def calculate_flyback(tab, inputs):
    """
    Processes specific electrical equations based on selected application topology.
    Correctly compensates for turns ratio shifts, DCM discharge times, and dummy loads.
    Calculates MOSFET conduction losses, current limitations, and RCD Snubber parameters.
    Also exports step-by-step formulas and calculations with live substitutions and active variables.
    """
    warnings = []
    
    try:
        Vout = float(inputs.get('Vout', 12.0))
        Iout = float(inputs.get('Iout', 2.0))
        Vf = float(inputs.get('Vf', 0.7))
        fsw = float(inputs.get('fsw', 65000))
        eff = float(inputs.get('eff', 0.8))
        Kr = float(inputs.get('Kr', 0.4))
        Dmax_target = float(inputs.get('Dmax', 0.45))
        Ae = float(inputs.get('Ae', 118.0))
        Aw = float(inputs.get('Aw', 85.0))
        Bmax = float(inputs.get('Bmax', 0.25))
        J = float(inputs.get('J', 5.0))
        
        # MOSFET Specs
        Vds_max = float(inputs.get('Vds_max', 650.0))
        Rds_on = float(inputs.get('Rds_on', 0.85))
        default_ids_max = 8.0 if tab == 'acdc' else (40.0 if tab == 'dcdc' else 15.0)
        Ids_max = float(inputs.get('Ids_max', default_ids_max))
        
        # Boolean parameter to check if Aux Winding exists
        has_aux = int(inputs.get('has_aux', 1)) == 1
        has_snubber = int(inputs.get('has_snubber', 1)) == 1
        
        # Target Mode selection: 'auto', 'ccm', 'dcm'
        mode = inputs.get('mode', 'auto')
    except (ValueError, TypeError):
        return {'success': False, 'error': 'خطا در تبدیل مقادیر ورودی به عدد'}

    if mode == 'ccm':
        if Kr >= 2.0 or Kr <= 0:
            Kr = 0.4
    elif mode == 'dcm':
        if Kr < 2.0:
            Kr = 2.0

    # مقداردهی اولیه برای جلوگیری از خطای متغیرهای تعریف نشده در تب‌های مختلف
    Vin_min_DC = 0.0
    Vin_max_DC = 0.0
    C_bulk = 0.0
    Pout = 0.0
    Pin = 0.0
    Vac_min = float(inputs.get('Vac_min', 85.0))
    Vac_max = float(inputs.get('Vac_max', 265.0))
    f_line = float(inputs.get('f_line', 50.0))

    if tab == 'acdc':
        # Offline AC-DC with bulk capacitor valley voltage analysis
        Vaux = float(inputs.get('Vaux', 15.0)) if has_aux else 0.0
        Iaux = float(inputs.get('Iaux', 0.1)) if has_aux else 0.0
        
        Pout = (Vout + Vf) * Iout + (Vaux + Vf) * Iaux if has_aux else (Vout + Vf) * Iout
        Pin = Pout / eff
        
        # طراحی مهندسی با هدف قرار دادن افت ولتاژ مینیمم لینک DC روی ۹۰٪ ولتاژ متناوب کمینه ورودی
        Vin_min_DC = Vac_min * 0.9
        Vin_max_DC = Vac_max * math.sqrt(2)
        
        # محاسبه دقیق مقدار خازن صافی ورودی مورد نیاز بر اساس ریپل ولتاژ مجاز
        denom = f_line * (2 * (Vac_min ** 2) - (Vin_min_DC ** 2))
        if denom > 0:
            C_bulk = (Pin * 0.75) / denom * 1e6
        else:
            C_bulk = 68.0

        if C_bulk < (Pout * 1.5):
            warnings.append(f"خازن محاسباتی ({C_bulk:.1f}uF) کمتر از حد توصیه شده عمومی (1.5uF/W الی 3uF/W) برای پایداری ریپل است. پیشنهاد می‌شود راندمان یا ولتاژ کمینه ورودی را مجدداً ارزیابی کنید.")

    elif tab == 'dcdc':
        # General Low-Voltage DC-DC
        Vin_min_DC = float(inputs.get('Vin_min', 18.0))
        Vin_max_DC = float(inputs.get('Vin_max', 32.0))
        Vaux = float(inputs.get('Vaux', 12.0)) if has_aux else 0.0
        Iaux = float(inputs.get('Iaux', 0.05)) if has_aux else 0.0
        
        Pout = (Vout + Vf) * Iout + (Vaux + Vf) * Iaux if has_aux else (Vout + Vf) * Iout
        Pin = Pout / eff

    elif tab == 'charger':
        # Dedicated Smart Charger Settings
        Vin_min_DC = float(inputs.get('Vin_min', 240.0))
        Vin_max_DC = float(inputs.get('Vin_max', 375.0))
        Vfloat = float(inputs.get('Vfloat', 14.4))
        Vcutoff = float(inputs.get('Vcutoff', 9.0))
        Icharge = float(inputs.get('Icharge', 4.0))
        Vaux_nom = float(inputs.get('Vaux_nom', 15.0)) if has_aux else 0.0
        Vaux_uvlo = float(inputs.get('Vaux_uvlo', 9.0)) if has_aux else 0.0
        Iaux = float(inputs.get('Iaux', 0.08)) if has_aux else 0.0
        fsw_min = float(inputs.get('fsw_min', 150.0))
        Ipeak_min_ratio = float(inputs.get('Ipeak_min_ratio', 0.25))
        
        Vout = Vfloat 
        Vaux = Vaux_nom
        Iout = Icharge
        Pout = (Vout + Vf) * Iout + (Vaux + Vf) * Iaux if has_aux else (Vout + Vf) * Iout
        Pin = Pout / eff

        # مانند مبدل AC-DC، شارژر هوشمند هم پیش از رسیدن به باس DC (Vin_min..Vin_max) از یک پل
        # دیود و خازن صافی ورودی عبور می‌کند، بنابراین باید ظرفیت این خازن صافی نیز محاسبه و
        # به کاربر نمایش داده شود؛ محاسبه بر پایه همان رابطه ریپل ولتاژ خازن صافی AC-DC است با
        # این تفاوت که حداقل ولتاژ باس DC واقعی (Vin_min_DC) مستقیماً از ورودی کاربر خوانده می‌شود.
        denom_chg = f_line * (2 * (Vac_min ** 2) - (Vin_min_DC ** 2))
        if denom_chg > 0:
            C_bulk = (Pin * 0.75) / denom_chg * 1e6
        else:
            C_bulk = 68.0

        if C_bulk < (Pout * 1.5):
            warnings.append(f"خازن محاسباتی ({C_bulk:.1f}uF) کمتر از حد توصیه شده عمومی (1.5uF/W الی 3uF/W) برای پایداری ریپل است. پیشنهاد می‌شود راندمان یا ولتاژ کمینه ورودی را مجدداً ارزیابی کنید.")

    # Standardize parameters and compute essential power metrics
    if Vin_min_DC <= 0 or Dmax_target <= 0 or fsw <= 0 or Ae <= 0 or Aw <= 0:
        return {'success': False, 'error': 'مقادیر فیزیکی ورودی نامعتبر است (صفر یا منفی)'}

    Iin_avg_target = Pin / (Vin_min_DC * Dmax_target)
    is_dcm_init = Kr >= 2.0

    if is_dcm_init:
        # Initial target sizing in DCM
        Lp = (Vin_min_DC**2 * Dmax_target**2 * eff) / (2 * Pout * fsw) if Pout > 0 else 0.0
        I_peak_target = (Vin_min_DC * Dmax_target) / (Lp * fsw) if (Lp * fsw) > 0 else 0.0
        I_ripple_target = I_peak_target # Ensures safety if realized mode dynamically drops to CCM
    else:
        # Initial target sizing in CCM
        I_ripple_target = Kr * Iin_avg_target
        I_peak_target = Iin_avg_target + (I_ripple_target / 2.0)
        Lp = (Vin_min_DC * Dmax_target) / (I_ripple_target * fsw) if (I_ripple_target * fsw) > 0 else 0.0

    Lp_uH = Lp * 1000000.0

    Np_min = math.ceil((Lp * I_peak_target) / (Bmax * Ae * 1e-6)) if (Bmax * Ae * 1e-6) > 0 else 1
    Vro_target = Vin_min_DC * (Dmax_target / (1.0 - Dmax_target)) if (1.0 - Dmax_target) > 0 else 1.0
    n_target = Vro_target / (Vout + Vf) if (Vout + Vf) > 0 else 1.0
    
    Ns = max(1, round(Np_min / n_target)) if n_target > 0 else 1
    Np = max(Np_min, round(Ns * n_target))
    
    if has_aux:
        Naux_turns = max(1, round((Vaux + Vf) * (Ns / (Vout + Vf)))) if (Vout + Vf) > 0 else 1
    else:
        Naux_turns = 0

    n_real = Np / Ns if Ns > 0 else 1.0
    Vro_real = n_real * (Vout + Vf)
    D_real = Vro_real / (Vin_min_DC + Vro_real) if (Vin_min_DC + Vro_real) > 0 else 0.0

    # Realized CCM/DCM Boundary Verification
    P_boundary = (Vin_min_DC**2 * D_real**2) / (2.0 * Lp * fsw) if Lp > 0 else 0.0
    is_dcm = Pin < P_boundary

    if is_dcm:
        # Actual operating currents in Discontinuous Conduction Mode (DCM)
        I_valley = 0.0
        I_peak = math.sqrt((2.0 * Pin) / (Lp * fsw)) if (Lp * fsw) > 0 else 0.0
        I_ripple = I_peak # Define I_ripple for DCM so formulas don't raise NameError in front-end string eval
        # Re-verify the actual physical duty cycle in DCM based on realized peak current
        D_real = (I_peak * Lp * fsw) / Vin_min_DC if Vin_min_DC > 0 else 0.0
        D_sec = (I_peak * Lp * fsw) / Vro_real if Vro_real > 0 else 0.0
        I_peak_sec = I_peak * n_real
        I_valley_sec = 0.0
    else:
        # Actual operating currents in Continuous Conduction Mode (CCM)
        I_ripple = (Vin_min_DC * D_real) / (Lp * fsw) if (Lp * fsw) > 0 else 0.0
        I_in_avg = Pin / (Vin_min_DC * D_real) if (Vin_min_DC * D_real) > 0 else 0.0
        I_peak = I_in_avg + (I_ripple / 2.0)
        I_valley = max(0.0, I_in_avg - (I_ripple / 2.0))
        D_sec = 1.0 - D_real
        I_peak_sec = I_peak * n_real
        I_valley_sec = I_valley * n_real

    B_real = (Lp * I_peak) / (Np * Ae * 1e-6) if (Np * Ae * 1e-6) > 0 else 0.0

    # ------------------------------------------------------------------
    # RCD Snubber / Leakage Clamp network (moved up from below so its
    # result - V_clamp - is available for the MOSFET voltage stress
    # check right below, instead of the check running against an
    # unrelated fixed +35% spike guess while the actual snubber design
    # computed a different clamp voltage further down in the file).
    # ------------------------------------------------------------------
    L_leakage = Lp * 0.025
    V_clamp = Vin_max_DC + (1.4 * Vro_real) if Vin_max_DC > 0 else Vro_real * 2.4

    V_snub_cap = V_clamp - Vin_max_DC if V_clamp > Vin_max_DC else Vro_real
    if V_snub_cap <= 0:
        V_snub_cap = Vro_real

    val_diff = V_snub_cap - Vro_real
    if val_diff <= 0.1:
        val_diff = 1.0

    snub_power_num = 0.5 * L_leakage * (I_peak ** 2) * fsw * (V_snub_cap / val_diff)
    R_snub = (V_snub_cap ** 2) / snub_power_num if snub_power_num > 0 else 100000.0

    delta_v_snub = V_snub_cap * 0.08
    C_snub = V_snub_cap / (R_snub * fsw * delta_v_snub) if (R_snub * fsw * delta_v_snub) > 0 else 1e-9
    P_snub = snub_power_num

    # Stress Analysis
    # When an RCD snubber is actually present, it is the clamp voltage
    # (V_clamp) that physically caps the MOSFET Vds - so the safety
    # evaluation below must compare against V_clamp itself, not an
    # independent fixed-percentage spike estimate. Without a snubber
    # there is nothing to enforce a clamp, so we fall back to the
    # conservative +35% leakage-spike approximation as before.
    V_spike = Vro_real * 0.35
    V_stress_no_snubber_estimate = Vin_max_DC + Vro_real + V_spike
    V_stress = V_clamp if has_snubber else V_stress_no_snubber_estimate

    I_rms_pri = math.sqrt(D_real * (I_peak**2 + I_peak * I_valley + I_valley**2) / 3.0)
    D_wire_pri = 2.0 * math.sqrt((I_rms_pri / J) / math.pi) if (J * math.pi) > 0 else 0.0

    I_rms_sec = math.sqrt(D_sec * (I_peak_sec**2 + I_peak_sec * I_valley_sec + I_valley_sec**2) / 3.0)
    D_wire_sec = 2.0 * math.sqrt((I_rms_sec / J) / math.pi) if (J * math.pi) > 0 else 0.0

    # Skin-effect depth in copper at the chosen switching frequency
    # (delta[mm] ~ 66.2 / sqrt(f[Hz]), standard copper-at-room-temperature
    # approximation). If the required solid wire diameter is more than
    # twice this depth, most of the conductor cross-section carries no
    # useful current at fsw and a stranded/Litz wire should be used instead.
    skin_depth_mm = 66.2 / math.sqrt(fsw) if fsw > 0 else 0.0
    if skin_depth_mm > 0 and (D_wire_pri > 2.0 * skin_depth_mm or D_wire_sec > 2.0 * skin_depth_mm):
        warnings.append(
            f"هشدار اثر پوستی (Skin Effect)! در فرکانس سوئیچینگ {fsw:.0f}Hz عمق نفوذ پوستی مس حدود "
            f"{skin_depth_mm:.3f}mm است. قطر سیم محاسبه‌شده برای اولیه یا ثانویه از دو برابر این عمق نفوذ "
            "بیشتر است، یعنی بخش قابل توجهی از سطح مقطع سیم عملاً جریانی حمل نمی‌کند و مقاومت مؤثر AC آن بالاتر "
            "از مقدار DC محاسبه‌شده خواهد بود. استفاده از چند رشته سیم موازی نازک‌تر یا سیم لیتز (Litz Wire) توصیه می‌شود."
        )

    AirGap = (4.0 * math.pi * 1e-4 * (Np**2) * Ae) / Lp_uH if Lp_uH > 0 else 0.0
    A_cu_pri = Np * (math.pi * ((D_wire_pri / 2.0)**2))
    A_cu_sec = Ns * (math.pi * ((D_wire_sec / 2.0)**2))
    A_cu_aux = Naux_turns * (math.pi * ((0.2 / 2.0)**2)) if Naux_turns > 0 else 0.0
    FillFactor = (A_cu_pri + A_cu_sec + A_cu_aux) / Aw if Aw > 0 else 0.0

    # Loss calculations on MOSFET
    P_cond = (I_rms_pri ** 2) * Rds_on
    P_sw = 0.5 * Vin_min_DC * I_peak * (100e-9) * fsw
    P_loss_mosfet = P_cond + P_sw

    # Safety margin evaluation
    mosfet_voltage_safe = V_stress < (0.85 * Vds_max)
    mosfet_current_safe = I_peak < (0.7 * Ids_max)

    if not mosfet_voltage_safe:
        warnings.append(
            f"خطر تخریب ولتاژی ماسفت! ولتاژ ضربه گذرای کل درین-سورس ({V_stress:.0f}V) از محدوده ایمن ۸۵٪ ولتاژ مجاز ماسفت "
            f"({(0.85 * Vds_max):.0f}V) فراتر رفته است."
        )

    if not mosfet_current_safe:
        warnings.append(
            f"هشدار جریان نامی ماسفت! جریان پیک اولیه ({I_peak:.2f}A) از حد مجاز ایمن (۷۰٪ جریان نامی درین معادل "
            f"{(0.7 * Ids_max):.1f}A) فراتر رفته است."
        )

    # بررسی اشباع فیزیکی هسته ترانسفورماتور (پیش‌تر فقط با یک نشان کوچک در کارت نتایج نشان داده می‌شد
    # و هرگز به پنل هشدارهای اصلی نمی‌رسید؛ اکنون به‌عنوان یک خطای ترانس واقعی گزارش می‌شود)
    if B_real > Bmax:
        warnings.append(
            f"خطر اشباع هسته ترانسفورماتور! چگالی شار واقعی محاسبه‌شده ({B_real:.3f} تسلا) از حداکثر مقدار مجاز تعیین‌شده "
            f"({Bmax:.3f} تسلا) بیشتر است. کار در این نقطه باعث اشباع هسته، افزایش ناگهانی جریان مغناطیس‌کننده و احتمال "
            "آسیب به سوئیچ می‌شود. افزایش تعداد دور اولیه (Np)، انتخاب هسته با سطح مقطع (Ae) بزرگتر یا کاهش اندوکتانس اولیه "
            "(Lp) را در نظر بگیرید."
        )

    # بررسی پرشدگی بیش از حد پنجره سیم‌پیچی بوبین (خطای مهم دیگر ترانس که قبلاً فقط به‌صورت نشان رنگی نمایش داده می‌شد)
    if FillFactor > 0.40:
        warnings.append(
            f"ضریب پرشدگی پنجره بوبین ({(FillFactor * 100):.1f}%) از حد عملی توصیه‌شده (۴۰٪) فراتر رفته و احتمالاً "
            "سیم‌پیچی‌ها به‌شکل فیزیکی در پنجره بوبین انتخابی جا نمی‌شوند. استفاده از بوبین با مساحت پنجره (Aw) بزرگتر، "
            "کاهش تعداد دور یا افزایش چگالی جریان طراحی (J) را بررسی کنید."
        )

    # بررسی عبور دیوتی سایکل واقعی از مقدار هدف تعیین‌شده توسط کاربر
    if Dmax_target > 0 and D_real > Dmax_target * 1.03:
        warnings.append(
            f"دیوتی سایکل واقعی کارکرد ({(D_real * 100):.1f}%) پس از گرد شدن تعداد دورها، از حداکثر دیوتی سایکل هدف "
            f"({(Dmax_target * 100):.1f}%) که در ورودی‌ها تعیین کرده‌اید فراتر رفته است. در ولتاژ کمینه ورودی ممکن است "
            "کنترلر PWM به محدودیت دیوتی سایکل خود برخورد کرده و رگولاسیون خروجی از دست برود."
        )

    charger_html = ""
    if tab == 'charger':
        if has_aux:
            Vaux_min_working = (Vcutoff + Vf) * (Naux_turns / Ns) - Vf if Ns > 0 else 0.0
            if Vaux_min_working < Vaux_uvlo:
                warnings.append(
                    f"هشدار قطع ولتاژ کمکی! در وضعیت دشارژ عمیق باتری ({Vcutoff:.1f}V)، ولتاژ سیم‌پیچ کمکی به "
                    f"{Vaux_min_working:.1f}V افت می‌کند که پایین‌تر از حد ریست آی‌سی ({Vaux_uvlo:.1f}V) است. "
                    "دستگاه دچار استارت مجدد پیاپی (Hiccup) خواهد شد."
                )
        else:
            Vaux_min_working = 0.0
            Vaux_uvlo = 0.0
        
        Ipeak_min = I_peak * Ipeak_min_ratio
        P_burst_min = 0.5 * Lp * (Ipeak_min**2) * fsw_min
        R_dummy = (Vout**2) / P_burst_min if P_burst_min > 0 else 0.0
        
        charger_html = {
            'P_burst_min': P_burst_min,
            'R_dummy': R_dummy,
            'Vaux_min_working': Vaux_min_working,
            'Vaux_uvlo': Vaux_uvlo
        }

    # Helper Variables for mapping logical names to UI Input IDs (Especially for Charger Tab)
    v_out_str = 'Vfloat' if tab == 'charger' else 'Vout'
    i_out_str = 'Icharge' if tab == 'charger' else 'Iout'
    v_aux_str = 'Vaux_nom' if tab == 'charger' else 'Vaux'

    # Advanced Output Equation Formatter
    equations = {
        'Pin': {
            'math_formula': r'P_{in} = \frac{(V_{out} + V_f) \cdot I_{out} + (V_{aux} + V_f) \cdot I_{aux}}{\eta}' if has_aux else r'P_{in} = \frac{(V_{out} + V_f) \cdot I_{out}}{\eta}',
            'formula': 'Pin = ((Vout + Vf) * Iout + (Vaux + Vf) * Iaux) / eff' if has_aux else 'Pin = ((Vout + Vf) * Iout) / eff',
            'substituted': f'Pin = (({Vout:.1f} + {Vf:.1f}) * {Iout:.1f} + ({Vaux:.1f} + {Vf:.1f}) * {Iaux:.1f}) / {eff:.2f}' if has_aux else f'Pin = (({Vout:.1f} + {Vf:.1f}) * {Iout:.1f}) / {eff:.2f}',
            'result': f'{Pin:.1f} W',
            'related_vars': [v_out_str, 'Vf', i_out_str, v_aux_str, 'Iaux', 'eff'] if has_aux else [v_out_str, 'Vf', i_out_str, 'eff']
        },
        'Pout': {
            'math_formula': r'P_{out} = (V_{out} + V_f) \cdot I_{out} + (V_{aux} + V_f) \cdot I_{aux}' if has_aux else r'P_{out} = (V_{out} + V_f) \cdot I_{out}',
            'formula': 'Pout = (Vout + Vf) * Iout + (Vaux + Vf) * Iaux' if has_aux else 'Pout = (Vout + Vf) * Iout',
            'substituted': f'Pout = ({Vout:.1f} + {Vf:.1f}) * {Iout:.1f} + ({Vaux:.1f} + {Vf:.1f}) * {Iaux:.1f}' if has_aux else f'Pout = ({Vout:.1f} + {Vf:.1f}) * {Iout:.1f}',
            'result': f'{Pout:.1f} W',
            'related_vars': [v_out_str, 'Vf', i_out_str, v_aux_str, 'Iaux'] if has_aux else [v_out_str, 'Vf', i_out_str]
        },
        'Vin_min': {
            'math_formula': r'V_{in,min} = V_{ac,min} \cdot 0.9' if tab == 'acdc' else r'V_{in,min} = \text{Input DC Minimum}',
            'formula': 'Vin_min = Vac_min * 0.9' if tab == 'acdc' else 'Vin_min = Vin_min',
            'substituted': f'Vin_min = {Vac_min:.1f} * 0.9' if tab == 'acdc' else f'Vin_min = {Vin_min_DC:.1f}',
            'result': f'{Vin_min_DC:.1f} V',
            'related_vars': ['Vac_min'] if tab == 'acdc' else ['Vin_min']
        },
        'Vin_max': {
            'math_formula': r'V_{in,max} = V_{ac,max} \cdot \sqrt{2}' if tab == 'acdc' else r'V_{in,max} = \text{Input DC Maximum}',
            'formula': 'Vin_max = Vac_max * sqrt(2)' if tab == 'acdc' else 'Vin_max = Vin_max',
            'substituted': f'Vin_max = {Vac_max:.1f} * 1.414' if tab == 'acdc' else f'Vin_max = {Vin_max_DC:.1f}',
            'result': f'{Vin_max_DC:.1f} V',
            'related_vars': ['Vac_max'] if tab == 'acdc' else ['Vin_max']
        },
        'C_bulk': {
            'math_formula': r'C_{bulk} = \frac{P_{in} \cdot 0.75}{f_{line} \cdot \left(2 \cdot V_{ac,min}^2 - V_{in,min}^2\right)} \cdot 10^6' if tab in ('acdc', 'charger') else r'\text{N/A (DC-DC Mode)}',
            'formula': 'C_bulk = (Pin * 0.75) / (f_line * (2 * Vac_min^2 - Vin_min^2)) * 1e6' if tab in ('acdc', 'charger') else '0',
            'substituted': f'C_bulk = ({Pin:.1f} * 0.75) / ({f_line:.0f} * (2 * {Vac_min:.1f}^2 - {Vin_min_DC:.1f}^2)) * 1e6' if tab in ('acdc', 'charger') else '0',
            'result': f'{C_bulk:.1f} µF' if tab in ('acdc', 'charger') else '0 µF',
            'related_vars': ['Pin', 'f_line', 'Vac_min', 'Vin_min'] if tab in ('acdc', 'charger') else []
        },
        'I_ripple': {
            'math_formula': r'I_{ripple} = \frac{V_{in,min} \cdot D_{real}}{L_{p,uH} \cdot 10^{-6} \cdot f_{sw}}' if not is_dcm else r'I_{ripple} = I_{peak,pri} \text{ (DCM)}',
            'formula': 'I_ripple = (Vin_min * D_real) / (Lp_uH * 1e-6 * fsw)' if not is_dcm else 'I_ripple = I_peak_pri',
            'substituted': f'I_ripple = ({Vin_min_DC:.1f} * {D_real:.3f}) / ({Lp_uH:.1f} * 1e-6 * {fsw:.0f})' if not is_dcm else f'I_ripple = {I_peak:.2f}',
            'result': f'{I_ripple:.2f} A',
            'related_vars': ['Vin_min', 'D_real', 'Lp_uH', 'fsw'] if not is_dcm else ['I_peak_pri']
        },
        'Lp_uH': {
            'math_formula': r'L_{p,uH} = \frac{V_{in,min}^2 \cdot D_{max}^2 \cdot \eta}{2 \cdot P_{out} \cdot f_{sw}} \cdot 10^6' if is_dcm_init else r'L_{p,uH} = \frac{V_{in,min} \cdot D_{max}}{I_{ripple,target} \cdot f_{sw}} \cdot 10^6',
            'formula': 'Lp_uH = ((Vin_min^2 * Dmax^2 * eff) / (2 * Pout * fsw)) * 1e6' if is_dcm_init else 'Lp_uH = ((Vin_min * Dmax) / (I_ripple_target * fsw)) * 1e6',
            'substituted': f'Lp_uH = (({Vin_min_DC:.1f}^2 * {Dmax_target:.2f}^2 * {eff:.2f}) / (2 * {Pout:.2f} * {fsw:.0f})) * 1e6' if is_dcm_init else f'Lp_uH = (({Vin_min_DC:.1f} * {Dmax_target:.2f}) / ({I_ripple_target:.2f} * {fsw:.0f})) * 1e6',
            'result': f'{Lp_uH:.1f} µH',
            'related_vars': ['Vin_min', 'Dmax', 'eff', 'Pout', 'fsw'] if is_dcm_init else ['Vin_min', 'Dmax', 'fsw']
        },
        'D_real': {
            'math_formula': r'D_{real} = \frac{V_{ro,real}}{V_{in,min} + V_{ro,real}}' if not is_dcm else r'D_{real} = \frac{I_{peak,pri} \cdot L_{p,uH} \cdot 10^{-6} \cdot f_{sw}}{V_{in,min}}',
            'formula': 'D_real = Vro_real / (Vin_min + Vro_real)' if not is_dcm else 'D_real = (I_peak_pri * Lp_uH * 1e-6 * fsw) / Vin_min',
            'substituted': f'D_real = {Vro_real:.1f} / ({Vin_min_DC:.1f} + {Vro_real:.1f})' if not is_dcm else f'D_real = ({I_peak:.2f} * {Lp_uH:.1f} * 1e-6 * {fsw:.0f}) / {Vin_min_DC:.1f}',
            'result': f'{(D_real * 100):.1f} %',
            'related_vars': ['Vro_real', 'Vin_min'] if not is_dcm else ['I_peak_pri', 'Lp_uH', 'fsw', 'Vin_min']
        },
        'Np_min': {
            'math_formula': r'N_{p,min} = \frac{L_{p,uH} \cdot I_{peak,target}}{B_{max} \cdot A_e}',
            'formula': 'Np_min = (Lp_uH * I_peak_target) / (Bmax * Ae)',
            'substituted': f'Np_min = ({Lp_uH:.1f} * {I_peak_target:.2f}) / ({Bmax:.2f} * {Ae:.1f})',
            'result': f'{Np_min:.1f} turns',
            'related_vars': ['Lp_uH', 'I_peak_pri', 'Bmax', 'Ae']
        },
        'Np': {
            'math_formula': r'N_p = \max\left(N_{p,min}, \, \text{round}\left(N_s \cdot \frac{V_{in,min} \cdot D_{max}}{(1 - D_{max}) \cdot (V_{out} + V_f)}\right)\right)',
            'formula': 'Np = max(Np_min, round(Ns * ((Vin_min * Dmax) / ((1 - Dmax) * (Vout + Vf)))))',
            'substituted': f'Np = max({Np_min}, round({Ns} * (({Vin_min_DC:.1f} * {Dmax_target:.2f}) / ((1 - {Dmax_target:.2f}) * ({Vout:.1f} + {Vf:.1f})))))',
            'result': f'{Np} دور',
            'related_vars': ['Np_min', 'Ns', 'Vin_min', 'Dmax', v_out_str, 'Vf']
        },
        'Ns': {
            'math_formula': r'N_s = \max\left(1, \, \text{round}\left(\frac{N_{p,min}}{\frac{V_{in,min} \cdot D_{max}}{(1 - D_{max}) \cdot (V_{out} + V_f)}}\right)\right)',
            'formula': 'Ns = max(1, round(Np_min / ((Vin_min * Dmax) / ((1 - Dmax) * (Vout + Vf)))))',
            'substituted': f'Ns = max(1, round({Np_min} / (({Vin_min_DC:.1f} * {Dmax_target:.2f}) / ((1 - {Dmax_target:.2f}) * ({Vout:.1f} + {Vf:.1f})))))',
            'result': f'{Ns} دور',
            'related_vars': ['Np_min', 'Vin_min', 'Dmax', v_out_str, 'Vf']
        },
        'Naux': {
            'math_formula': r'N_{aux} = N_s \cdot \frac{V_{aux} + V_f}{V_{out} + V_f}' if has_aux else r'\text{No Aux Winding}',
            'formula': 'Naux = Ns * (Vaux + Vf) / (Vout + Vf)' if has_aux else '0',
            'substituted': f'Naux = {Ns} * ({Vaux:.1f} + {Vf:.1f}) / ({Vout:.1f} + {Vf:.1f})' if has_aux else '0',
            'result': f'{Naux_turns} دور',
            'related_vars': ['Ns', v_aux_str, 'Vf', v_out_str] if has_aux else []
        },
        'Vro_real': {
            'math_formula': r'V_{ro,real} = \frac{N_p}{N_s} \cdot (V_{out} + V_f)',
            'formula': 'Vro_real = (Np / Ns) * (Vout + Vf)',
            'substituted': f'Vro_real = ({Np} / {Ns}) * ({Vout:.1f} + {Vf:.1f})',
            'result': f'{Vro_real:.1f} V',
            'related_vars': ['Np', 'Ns', v_out_str, 'Vf']
        },
        'V_stress': {
            'math_formula': r'V_{stress} = V_{clamp}' if has_snubber else r'V_{stress} = V_{in,max} + V_{ro,real} + 0.35 \cdot V_{ro,real}',
            'formula': 'V_stress = V_clamp (RCD snubber clamped)' if has_snubber else 'V_stress = Vin_max + Vro_real + 0.35 * Vro_real',
            'substituted': f'V_stress = V_clamp = {V_clamp:.1f}' if has_snubber else f'V_stress = {Vin_max_DC:.1f} + {Vro_real:.1f} + 0.35 * {Vro_real:.1f}',
            'result': f'{V_stress:.0f} V',
            'related_vars': ['V_clamp'] if has_snubber else ['Vin_max', 'Vro_real']
        },
        'I_peak_pri': {
            'math_formula': r'I_{peak,pri} = \sqrt{\frac{2 \cdot P_{in}}{L_{p,uH} \cdot 10^{-6} \cdot f_{sw}}}' if is_dcm else r'I_{peak,pri} = \frac{P_{in}}{V_{in,min} \cdot D_{real}} + \frac{V_{in,min} \cdot D_{real}}{2 \cdot L_{p,uH} \cdot 10^{-6} \cdot f_{sw}}',
            'formula': 'I_peak_pri = sqrt((2 * Pin) / (Lp_uH * 1e-6 * fsw))' if is_dcm else 'I_peak_pri = Pin / (Vin_min * D_real) + (Vin_min * D_real) / (2 * Lp_uH * 1e-6 * fsw)',
            'substituted': f'I_peak_pri = sqrt((2 * {Pin:.1f}) / ({Lp_uH:.1f} * 1e-6 * {fsw:.0f}))' if is_dcm else f'I_peak_pri = {Pin:.1f} / ({Vin_min_DC:.1f} * {D_real:.3f}) + ({Vin_min_DC:.1f} * {D_real:.3f}) / (2 * {Lp_uH:.1f} * 1e-6 * {fsw:.0f})',
            'result': f'{I_peak:.2f} A',
            'related_vars': ['Pin', 'Lp_uH', 'fsw'] if is_dcm else ['Pin', 'Vin_min', 'D_real', 'Lp_uH', 'fsw']
        },
        'I_valley_pri': {
            'math_formula': r'I_{valley,pri} = 0' if is_dcm else r'I_{valley,pri} = \frac{P_{in}}{V_{in,min} \cdot D_{real}} - \frac{V_{in,min} \cdot D_{real}}{2 \cdot L_{p,uH} \cdot 10^{-6} \cdot f_{sw}}',
            'formula': 'I_valley_pri = 0' if is_dcm else 'I_valley_pri = Pin / (Vin_min * D_real) - (Vin_min * D_real) / (2 * Lp_uH * 1e-6 * fsw)',
            'substituted': 'I_valley_pri = 0' if is_dcm else f'I_valley_pri = {Pin:.1f} / ({Vin_min_DC:.1f} * {D_real:.3f}) - ({Vin_min_DC:.1f} * {D_real:.3f}) / (2 * {Lp_uH:.1f} * 1e-6 * {fsw:.0f})',
            'result': f'{I_valley:.2f} A',
            'related_vars': [] if is_dcm else ['Pin', 'Vin_min', 'D_real', 'Lp_uH', 'fsw']
        },
        'I_rms_pri': {
            'math_formula': r'I_{rms,pri} = \sqrt{\frac{D_{real} \cdot \left(I_{peak,pri}^2 + I_{peak,pri}\cdot I_{valley,pri} + I_{valley,pri}^2\right)}{3}}',
            'formula': 'I_rms_pri = sqrt(D_real * (I_peak_pri^2 + I_peak_pri * I_valley_pri + I_valley_pri^2) / 3)',
            'substituted': f'I_rms_pri = sqrt({D_real:.3f} * ({I_peak:.2f}^2 + {I_peak:.2f}*{I_valley:.2f} + {I_valley:.2f}^2) / 3)',
            'result': f'{I_rms_pri:.2f} A',
            'related_vars': ['D_real', 'I_peak_pri', 'I_valley_pri']
        },
        'D_wire_pri': {
            'math_formula': r'D_{wire,pri} = 2 \cdot \sqrt{\frac{I_{rms,pri} / J}{\pi}}',
            'formula': 'D_wire_pri = 2 * sqrt((I_rms_pri / J) / pi)',
            'substituted': f'D_wire_pri = 2 * sqrt(({I_rms_pri:.2f} / {J:.1f}) / 3.14159)',
            'result': f'{D_wire_pri:.2f} mm',
            'related_vars': ['I_rms_pri', 'J']
        },
        'D_wire_sec': {
            'math_formula': r'D_{wire,sec} = 2 \cdot \sqrt{\frac{I_{rms,sec} / J}{\pi}}',
            'formula': 'D_wire_sec = 2 * sqrt((I_rms_sec / J) / pi)',
            'substituted': f'D_wire_sec = 2 * sqrt(({I_rms_sec:.2f} / {J:.1f}) / 3.14159)',
            'result': f'{D_wire_sec:.2f} mm',
            'related_vars': ['I_rms_sec', 'J']
        },
        'skin_depth_mm': {
            'math_formula': r'\delta_{skin} = \frac{66.2}{\sqrt{f_{sw}}}',
            'formula': 'skin_depth_mm = 66.2 / sqrt(fsw)',
            'substituted': f'skin_depth_mm = 66.2 / sqrt({fsw:.0f})',
            'result': f'{skin_depth_mm:.3f} mm',
            'related_vars': ['fsw']
        },
        'I_rms_sec': {
            'math_formula': r'I_{rms,sec} = \sqrt{\frac{D_{sec} \cdot \left(I_{peak,sec}^2 + I_{peak,sec}\cdot I_{valley,sec} + I_{valley,sec}^2\right)}{3}}',
            'formula': 'I_rms_sec = sqrt(D_sec * (I_peak_sec^2 + I_peak_sec * I_valley_sec + I_valley_sec^2) / 3)',
            'substituted': f'I_rms_sec = sqrt({D_sec:.3f} * ({I_peak_sec:.2f}^2 + {I_peak_sec:.2f}*{I_valley_sec:.2f} + {I_valley_sec:.2f}^2) / 3)',
            'result': f'{I_rms_sec:.2f} A',
            'related_vars': ['D_sec', 'I_peak_sec', 'I_valley_sec']
        },
        'D_sec': {
            'math_formula': r'D_{sec} = \frac{I_{peak,pri} \cdot L_{p,uH} \cdot 10^{-6} \cdot f_{sw}}{V_{ro,real}}' if is_dcm else r'D_{sec} = 1 - D_{real}',
            'formula': 'D_sec = (I_peak_pri * Lp_uH * 1e-6 * fsw) / Vro_real' if is_dcm else 'D_sec = 1 - D_real',
            'substituted': f'D_sec = ({I_peak:.2f} * {Lp_uH:.1f} * 1e-6 * {fsw:.0f}) / {Vro_real:.1f}' if is_dcm else f'D_sec = 1 - {D_real:.3f}',
            'result': f'{D_sec:.3f}',
            'related_vars': ['I_peak_pri', 'Lp_uH', 'fsw', 'Vro_real'] if is_dcm else ['D_real']
        },
        'I_peak_sec': {
            'math_formula': r'I_{peak,sec} = I_{peak,pri} \cdot \frac{N_p}{N_s}',
            'formula': 'I_peak_sec = I_peak_pri * (Np / Ns)',
            'substituted': f'I_peak_sec = {I_peak:.2f} * ({Np} / {Ns})',
            'result': f'{I_peak_sec:.2f} A',
            'related_vars': ['I_peak_pri', 'Np', 'Ns']
        },
        'I_valley_sec': {
            'math_formula': r'I_{valley,sec} = I_{valley,pri} \cdot \frac{N_p}{N_s}',
            'formula': 'I_valley_sec = I_valley_pri * (Np / Ns)',
            'substituted': f'I_valley_sec = {I_valley:.2f} * ({Np} / {Ns})',
            'result': f'{I_valley_sec:.2f} A',
            'related_vars': ['I_valley_pri', 'Np', 'Ns']
        },
        'P_loss_mosfet': {
            'math_formula': r'P_{loss,mosfet} = I_{rms,pri}^2 \cdot R_{ds,on} + 0.5 \cdot V_{in,min} \cdot I_{peak,pri} \cdot 100 \cdot 10^{-9} \cdot f_{sw}',
            'formula': 'P_loss_mosfet = (I_rms_pri^2 * Rds_on) + (0.5 * Vin_min * I_peak_pri * 100e-9 * fsw)',
            'substituted': f'P_loss_mosfet = ({I_rms_pri:.2f}^2 * {Rds_on:.3f}) + (0.5 * {Vin_min_DC:.1f} * {I_peak:.2f} * 100e-9 * {fsw:.0f})',
            'result': f'{P_loss_mosfet:.2f} W',
            'related_vars': ['I_rms_pri', 'Rds_on', 'Vin_min', 'I_peak_pri', 'fsw']
        },
        'B_real': {
            'math_formula': r'B_{real} = \frac{L_{p,uH} \cdot I_{peak,pri}}{N_p \cdot A_e}',
            'formula': 'B_real = (Lp_uH * I_peak_pri) / (Np * Ae)',
            'substituted': f'B_real = ({Lp_uH:.1f} * {I_peak:.2f}) / ({Np} * {Ae:.1f})',
            'result': f'{B_real:.3f} Tesla',
            'related_vars': ['Lp_uH', 'I_peak_pri', 'Np', 'Ae']
        },
        'AirGap': {
            'math_formula': r'L_g = \frac{4\pi \cdot 10^{-4} \cdot N_p^2 \cdot A_e}{L_{p,uH}}',
            'formula': 'AirGap = (4 * pi * 1e-4 * Np^2 * Ae) / Lp_uH',
            'substituted': f'AirGap = (1.2566e-3 * {Np}^2 * {Ae:.1f}) / {Lp_uH:.1f}',
            'result': f'{AirGap:.3f} mm',
            'related_vars': ['Np', 'Ae', 'Lp_uH']
        },
        'FillFactor': {
            'math_formula': r'FF = \frac{N_p \cdot \pi \cdot \left(\frac{D_{wire,pri}}{2}\right)^2 + N_s \cdot \pi \cdot \left(\frac{D_{wire,sec}}{2}\right)^2 + N_{aux} \cdot \pi \cdot \left(\frac{0.2}{2}\right)^2}{A_w}' if has_aux else r'FF = \frac{N_p \cdot \pi \cdot \left(\frac{D_{wire,pri}}{2}\right)^2 + N_s \cdot \pi \cdot \left(\frac{D_{wire,sec}}{2}\right)^2}{A_w}',
            'formula': 'FillFactor = (Np * pi * (D_wire_pri / 2)^2 + Ns * pi * (D_wire_sec / 2)^2 + Naux * pi * (0.2 / 2)^2) / Aw' if has_aux else 'FillFactor = (Np * pi * (D_wire_pri / 2)^2 + Ns * pi * (D_wire_sec / 2)^2) / Aw',
            'substituted': f'FF = ({Np} * 3.14159 * ({D_wire_pri:.2f} / 2)^2 + {Ns} * 3.14159 * ({D_wire_sec:.2f} / 2)^2 + {Naux_turns} * 3.14159 * (0.2 / 2)^2) / {Aw:.1f}' if has_aux else f'FF = ({Np} * 3.14159 * ({D_wire_pri:.2f} / 2)^2 + {Ns} * 3.14159 * ({D_wire_sec:.2f} / 2)^2) / {Aw:.1f}',
            'result': f'{(FillFactor * 100):.1f} %',
            'related_vars': ['Np', 'Ns', 'Naux', 'D_wire_pri', 'D_wire_sec', 'Aw'] if has_aux else ['Np', 'Ns', 'D_wire_pri', 'D_wire_sec', 'Aw']
        }
    }

    if has_snubber:
        equations.update({
            'R_snub': {
                'math_formula': r'R_{snub} = \frac{(V_{clamp} - V_{in,max})^2}{P_{snub}}',
                'formula': 'R_snub = (V_clamp - Vin_max)^2 / P_snub',
                'substituted': f'R_snub = ({V_clamp:.1f} - {Vin_max_DC:.1f})^2 / {P_snub:.2f}',
                'result': f'{R_snub:.0f} Ω',
                'related_vars': ['V_clamp', 'Vin_max', 'P_snub']
            },
            'C_snub_nF': {
                'math_formula': r'C_{snub} = \frac{1}{0.08 \cdot R_{snub} \cdot f_{sw}} \cdot 10^9',
                'formula': 'C_snub_nF = (1 / (0.08 * R_snub * fsw)) * 1e9',
                'substituted': f'C_snub = (1 / (0.08 * {R_snub:.1f} * {fsw:.0f})) * 1e9',
                'result': f'{C_snub * 1e9:.2f} nF',
                'related_vars': ['R_snub', 'fsw']
            },
            'P_snub': {
                'math_formula': r'P_{snub} = 0.5 \cdot \left(0.025 \cdot L_{p,uH} \cdot 10^{-6}\right) \cdot I_{peak,pri}^2 \cdot f_{sw} \cdot \frac{V_{clamp} - V_{in,max}}{V_{clamp} - V_{in,max} - V_{ro,real}}',
                'formula': 'P_snub = 0.5 * (0.025 * Lp_uH * 1e-6) * I_peak_pri^2 * fsw * (V_clamp - Vin_max) / (V_clamp - Vin_max - Vro_real)',
                'substituted': f'P_snub = 0.5 * (0.025 * {Lp_uH:.1f} * 1e-6) * {I_peak:.2f}^2 * {fsw:.0f} * ({V_clamp:.1f} - {Vin_max_DC:.1f}) / ({V_clamp:.1f} - {Vin_max_DC:.1f} - {Vro_real:.1f})',
                'result': f'{P_snub:.2f} W',
                'related_vars': ['Lp_uH', 'I_peak_pri', 'fsw', 'V_clamp', 'Vin_max', 'Vro_real']
            },
            'V_clamp': {
                'math_formula': r'V_{clamp} = V_{in,max} + 1.4 \cdot V_{ro,real}',
                'formula': 'V_clamp = Vin_max + 1.4 * Vro_real',
                'substituted': f'V_clamp = {Vin_max_DC:.1f} + 1.4 * {Vro_real:.1f}',
                'result': f'{V_clamp:.0f} V',
                'related_vars': ['Vin_max', 'Vro_real']
            }
        })

    if tab == 'charger':
        charger_eqs = {
            'P_burst_min': {
                'math_formula': r'P_{burst,min} = 0.5 \cdot L_{p,uH} \cdot 10^{-6} \cdot \left(I_{peak,pri} \cdot I_{peak,min,ratio}\right)^2 \cdot f_{sw,min}',
                'formula': 'P_burst_min = 0.5 * Lp_uH * 1e-6 * (I_peak_pri * Ipeak_min_ratio)^2 * fsw_min',
                'substituted': f'P_burst_min = 0.5 * {Lp_uH:.1f} * 1e-6 * ({I_peak:.2f} * {Ipeak_min_ratio:.2f})^2 * {fsw_min:.0f}',
                'result': f'{P_burst_min:.3f} W',
                'related_vars': ['Lp_uH', 'I_peak_pri', 'Ipeak_min_ratio', 'fsw_min']
            },
            'R_dummy': {
                'math_formula': r'R_{dummy} = \frac{V_{float}^2}{P_{burst,min}}',
                'formula': 'R_dummy = Vfloat^2 / P_burst_min',
                'substituted': f'R_dummy = {Vfloat:.2f}^2 / {P_burst_min:.3f}',
                'result': f'{R_dummy:.0f} Ω',
                'related_vars': ['Vfloat', 'P_burst_min']
            }
        }
        
        if has_aux:
            charger_eqs['Vaux_min_working'] = {
                'math_formula': r'V_{aux,min} = (V_{cutoff} + V_f) \cdot \frac{N_{aux}}{N_s} - V_f',
                'formula': 'Vaux_min_working = (Vcutoff + Vf) * (Naux / Ns) - Vf',
                'substituted': f'Vaux_min_working = ({Vcutoff:.1f} + {Vf:.2f}) * ({Naux_turns} / {Ns}) - {Vf:.2f}',
                'result': f'{Vaux_min_working:.1f} V',
                'related_vars': ['Vcutoff', 'Vf', 'Naux', 'Ns']
            }
            
        equations.update(charger_eqs)

    # --------------------------------------------------------------------
    # Practical / Off-the-shelf values
    # The numbers above are the "ideal" mathematical results. In real builds,
    # engineers substitute the nearest standard/available component and add
    # empirical safety margins. None of this changes the physics above -
    # it is presented as a separate reference next to the raw calculations.
    # --------------------------------------------------------------------
    D_wire_pri_practical = standard_wire_diameter_mm(D_wire_pri)
    D_wire_sec_practical = standard_wire_diameter_mm(D_wire_sec)

    practical = {
        'D_wire_pri_practical': D_wire_pri_practical,
        'D_wire_sec_practical': D_wire_sec_practical,
    }

    equations['D_wire_pri_practical'] = {
        'math_formula': r'D_{wire,pri}^{practical} = \text{nearest standard wire size} \geq D_{wire,pri}',
        'formula': 'D_wire_pri_practical = standard_wire_diameter(D_wire_pri)',
        'substituted': f'D_wire_pri_practical = nearest_standard_size({D_wire_pri:.2f} mm)',
        'result': f'{D_wire_pri_practical:.2f} mm',
        'related_vars': ['D_wire_pri']
    }
    equations['D_wire_sec_practical'] = {
        'math_formula': r'D_{wire,sec}^{practical} = \text{nearest standard wire size} \geq D_{wire,sec}',
        'formula': 'D_wire_sec_practical = standard_wire_diameter(D_wire_sec)',
        'substituted': f'D_wire_sec_practical = nearest_standard_size({D_wire_sec:.2f} mm)',
        'result': f'{D_wire_sec_practical:.2f} mm',
        'related_vars': ['D_wire_sec']
    }

    if tab in ('acdc', 'charger'):
        C_bulk_practical = standard_bulk_cap_uF(C_bulk * 2.0)
        practical['C_bulk_practical'] = C_bulk_practical
        equations['C_bulk_practical'] = {
            'math_formula': r'C_{bulk}^{practical} = \text{nearest catalog value} \geq 2 \times C_{bulk}',
            'formula': 'C_bulk_practical = standard_bulk_cap(2 * C_bulk)',
            'substituted': f'C_bulk_practical = nearest_catalog_value(2 * {C_bulk:.1f} µF)',
            'result': f'{C_bulk_practical:.0f} µF',
            'related_vars': ['C_bulk']
        }

    if has_snubber:
        R_snub_practical = standard_resistor(R_snub, 'nearest')
        C_snub_practical_nF = standard_capacitor_nF(C_snub * 1e9, 'up')
        practical['R_snub_practical'] = R_snub_practical
        practical['C_snub_practical_nF'] = C_snub_practical_nF
        equations['R_snub_practical'] = {
            'math_formula': r'R_{snub}^{practical} = \text{nearest E24 standard resistor}',
            'formula': 'R_snub_practical = standard_resistor(R_snub)',
            'substituted': f'R_snub_practical = nearest_E24({R_snub:.0f} Ω)',
            'result': f'{R_snub_practical:.0f} Ω',
            'related_vars': ['R_snub']
        }
        equations['C_snub_practical_nF'] = {
            'math_formula': r'C_{snub}^{practical} = \text{nearest E12 standard capacitor} \geq C_{snub}',
            'formula': 'C_snub_practical_nF = standard_capacitor(C_snub_nF, up)',
            'substituted': f'C_snub_practical_nF = nearest_E12({(C_snub * 1e9):.2f} nF)',
            'result': f'{C_snub_practical_nF:.2f} nF',
            'related_vars': ['C_snub_nF']
        }

    if tab == 'charger':
        R_dummy_practical = standard_resistor(R_dummy, 'down')
        practical['R_dummy_practical'] = R_dummy_practical
        equations['R_dummy_practical'] = {
            'math_formula': r'R_{dummy}^{practical} = \text{nearest E24 standard resistor} \leq R_{dummy}',
            'formula': 'R_dummy_practical = standard_resistor(R_dummy, down)',
            'substituted': f'R_dummy_practical = nearest_E24_down({R_dummy:.0f} Ω)',
            'result': f'{R_dummy_practical:.0f} Ω',
            'related_vars': ['R_dummy']
        }

    return {
        'success': True,
        'Pout': Pout, 'Pin': Pin, 'Lp_uH': Lp_uH, 'Np': Np, 'Ns': Ns, 'Naux': Naux_turns,
        'D_real': D_real, 'D_sec': D_sec, 'B_real': B_real, 'Vro_real': Vro_real, 'V_stress': V_stress,
        'I_rms_pri': I_rms_pri, 'I_rms_sec': I_rms_sec, 'D_wire_pri': D_wire_pri, 'D_wire_sec': D_wire_sec,
        'AirGap': AirGap, 'FillFactor': FillFactor, 'is_dcm': is_dcm, 'warnings': warnings,
        'skin_depth_mm': skin_depth_mm,
        'Bmax': Bmax,
        'I_peak_pri': I_peak, 'I_valley_pri': I_valley, 'I_peak_sec': I_peak_sec, 'I_valley_sec': I_valley_sec,
        'C_bulk_val': C_bulk if tab in ('acdc', 'charger') else 0.0,
        'charger_specs': charger_html,
        'P_loss_mosfet': P_loss_mosfet,
        'mosfet_safe': mosfet_voltage_safe and mosfet_current_safe,
        'has_aux': has_aux,
        'has_snubber': has_snubber,
        'R_snub': R_snub,
        'C_snub_nF': C_snub * 1e9,
        'P_snub': P_snub,
        'V_clamp': V_clamp,
        'practical': practical,
        'equations': equations
    }