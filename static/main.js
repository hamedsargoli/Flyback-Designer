// ==============================================================================
// Project: Flyback Transformer Design Suite - Orchestration & Interaction Script
// Version: 6.8
// AI Instruction: Whenever any AI model edits, refactors, or updates this file,
//                 please increment the version number above by exactly +0.1.
// ==============================================================================
// Frontend script coordinating user interaction, asynchronous backend calculations, and waveform rendering.

// Tab Configurations
const tabConfigs = {
    acdc: {
        title: "مبدل AC-DC ولتاژ بالا (High-Voltage Offline)",
        intro: "مخصوص طراحی منابع تغذیه متصل به برق شهر (Mains). ولتاژ ورودی متناوب (AC) با پل دیود و خازن صافی به ولتاژ مستقیم با ریپل بالا تبدیل می‌شود. انتخاب خازن صافی ورودی و محاسبه حداقل سطح ولتاژ DC تاثیر قطعی روی طراحی ترانس دارد.",
        inputs: [
            // Group 1: Electrical Specs
            { id: 'Vac_min', label: 'Vac_min (حداقل ولتاژ AC ورودی)', val: 85, unit: 'V', group: 'electrical', tooltip: 'Minimum AC input RMS voltage (Vac_min). Typically 85V AC for universal mains networks.\nسرچ جهت اطلاعات بیشتر: Flyback Vac_min design' },
            { id: 'Vac_max', label: 'Vac_max (حداکثر ولتاژ AC ورودی)', val: 265, unit: 'V', group: 'electrical', tooltip: 'Maximum AC input RMS voltage (Vac_max). Typically 265V AC for universal mains networks.\nسرچ جهت اطلاعات بیشتر: Flyback Vac_max input' },
            { id: 'f_line', label: 'f_line (فرکانس برق شبکه)', val: 50, unit: 'Hz', group: 'electrical', tooltip: 'Mains network frequency. 50Hz for Iran/Europe or 60Hz for US.\nسرچ جهت اطلاعات بیشتر: Mains grid line frequency' },
            { id: 'Vout', label: 'Vout (ولتاژ مستقیم خروجی)', val: 12, unit: 'V', group: 'electrical', tooltip: 'Regulated direct voltage target required by the secondary load.\nسرچ جهت اطلاعات بیشتر: Flyback output voltage' },
            { id: 'Iout', label: 'Iout (جریان نامی خروجی)', val: 2, unit: 'A', group: 'electrical', tooltip: 'Maximum load current that the secondary winding must supply continuously.\nسرچ جهت اطلاعات بیشتر: Flyback rated output current' },
            { id: 'Vf', label: 'Vf (افت ولتاژ دیود ثانویه)', val: 0.7, unit: 'V', group: 'electrical', tooltip: 'Forward barrier voltage drop of the output rectifier diode. Usually 0.4V to 1V.\nسرچ جهت اطلاعات بیشتر: Schottky diode forward voltage drop Vf' },
            { id: 'fsw', label: 'fsw (فرکانس سوئیچینگ)', val: 65000, unit: 'Hz', group: 'electrical', tooltip: 'Operating oscillation frequency of the PWM controller gate drive.\nسرچ جهت اطلاعات بیشتر: Flyback switching frequency trade-offs' },
            { id: 'Vaux', label: 'Vaux (ولتاژ سیم‌پیچ کمکی)', val: 15, unit: 'V', group: 'electrical', tooltip: 'Supply voltage generated for self-powering the primary PWM controller IC.\nسرچ جهت اطلاعات بیشتر: Flyback auxiliary winding voltage' },
            { id: 'Iaux', label: 'Iaux (جریان سیم‌پیچ کمکی)', val: 0.1, unit: 'A', group: 'electrical', tooltip: 'Maximum current required by the primary controller and startup circuit.\nسرچ جهت اطلاعات পণ্ডিত: PWM controller supply current Iaux' },
            { id: 'eff', label: 'eff (راندمان پیش‌بینی شده)', val: 0.80, unit: 'Ratio', group: 'electrical', tooltip: 'Target electrical efficiency of the power converter. Usually between 0.75 and 0.90.\nسرچ جهت اطلاعات بیشتر: Flyback efficiency optimization' },
            { id: 'Kr', label: 'Kr (ضریب ریپل جریان)', val: 0.4, unit: 'Ratio', group: 'electrical', tooltip: 'Ratio of primary inductor ripple current to average input current. Kr < 2.0 indicates CCM.\nسرچ جهت اطلاعات بیشتر: Flyback current ripple ratio Kr' },
            { id: 'Dmax', label: 'Dmax (حداکثر دیوتی سایکل هدف)', val: 0.45, unit: 'Ratio', group: 'electrical', tooltip: 'Maximum ratio of switch ON-time to total period. Keeping it below 0.5 is recommended.\nسرچ جهت اطلاعات بیشتر: Flyback maximum duty cycle limit' },
            
            // Group 2: Magnetics
            { id: 'Ae', label: 'Ae (سطح مقطع موثر هسته)', val: 118, unit: 'mm²', group: 'magnetics', tooltip: 'Effective cross-sectional area of the magnetic core inside the ferrite bobbin.\nسرچ جهت اطلاعات بیشتر: Ferrite core effective area Ae' },
            { id: 'Aw', label: 'Aw (مساحت پنجره بوبین)', val: 85, unit: 'mm²', group: 'magnetics', tooltip: 'Total available physical winding area inside the bobbin window.\nسرچ جهت اطلاعات بیشتر: Bobbin window area Aw' },
            { id: 'Bmax', label: 'Bmax (حداکثر چگالی شار کاری)', val: 0.25, unit: 'Tesla', group: 'magnetics', tooltip: 'Maximum magnetic flux density to prevent core saturation. Must be below 0.3T for ferrite.\nسرچ جهت اطلاعات بیشتر: Ferrite core saturation flux density Bmax' },
            { id: 'J', label: 'J (چگالی جریان سیم‌ها)', val: 5.0, unit: 'A/mm²', group: 'magnetics', tooltip: 'Current capacity density per unit area of copper. Usually 4 to 6 A/mm².\nسرچ جهت اطلاعات بیشتر: Transformer wire current density J' },

            // Group 3: MOSFET Switch Specs
            { id: 'Vds_max', label: 'Vds_max (ولتاژ حد درین-سورس)', val: 650, unit: 'V', group: 'mosfet', tooltip: 'Maximum rated breakdown voltage between drain and source from MOSFET datasheet.\nسرچ جهت اطلاعات بیشتر: MOSFET Vds breakdown rating' },
            { id: 'Rds_on', label: 'Rds_on (مقاومت کانال روشن)', val: 0.85, unit: 'Ω', group: 'mosfet', tooltip: 'Drain-source on-state resistance at operating temperature.\nسرچ جهت اطلاعات بیشتر: MOSFET Rds_on temperature coefficient' },
            { id: 'Ids_max', label: 'Ids_max (حداکثر جریان درین)', val: 8.0, unit: 'A', group: 'mosfet', tooltip: 'Maximum continuous drain current capacity of the selected MOSFET switch.\nسرچ جهت اطلاعات بیشتر: MOSFET continuous drain current Ids' }
        ]
    },
    dcdc: {
        title: "مبدل DC-DC صنعتی (Low-Voltage DC-DC)",
        intro: "مخصوص طراحی سیستم‌های تغذیه ایزوله با ورودی ولتاژ مستقیم فاقد پل دیود صافی (مانند سیستم‌های ۲۴ ولت صنعتی یا سیستم‌های خورشیدی و مخابراتی ۴۸ ولت). محاسبات ورودی بر اساس مقادیر مستقیم DC ورودی انجام می‌شود.",
        inputs: [
            // Group 1: Electrical Specs
            { id: 'Vin_min', label: 'Vin_min (حداقل ولتاژ مستقیم ورودی)', val: 18, unit: 'V', group: 'electrical', tooltip: 'Lowest expected DC source voltage (from battery discharge, etc.).\nسرچ جهت اطلاعات بیشتر: DC-DC Flyback Vin_min' },
            { id: 'Vin_max', label: 'Vin_max (حداکثر ولتاژ مستقیم ورودی)', val: 32, unit: 'V', group: 'electrical', tooltip: 'Highest expected DC source voltage.\nسرچ جهت اطلاعات بیشتر: DC-DC Flyback Vin_max' },
            { id: 'Vout', label: 'Vout (ولتاژ مستقیم خروجی)', val: 12, unit: 'V', group: 'electrical', tooltip: 'Target output direct current (DC) regulated voltage.\nسرچ جهت اطلاعات بیشتر: Flyback output voltage' },
            { id: 'Iout', label: 'Iout (جریان نامی خروجی)', val: 2, unit: 'A', group: 'electrical', tooltip: 'Continuous secondary output load current capacity.\nسرچ جهت اطلاعات بیشتر: Flyback rated output current' },
            { id: 'Vf', label: 'Vf (افت ولتاژ دیود ثانویه)', val: 0.7, unit: 'V', group: 'electrical', tooltip: 'Forward barrier of the output Schottky rectifier diode.\nسرچ جهت اطلاعات بیشتر: Schottky diode forward voltage drop' },
            { id: 'fsw', label: 'fsw (فرکانس سوئیچینگ)', val: 65000, unit: 'Hz', group: 'electrical', tooltip: 'Operating frequency of primary switch.\nسرچ جهت اطلاعات بیشتر: DC-DC converter switching frequency' },
            { id: 'Vaux', label: 'Vaux (ولتاژ سیم‌پیچ کمکی)', val: 15, unit: 'V', group: 'electrical', tooltip: 'Supply voltage target generated for powering the primary controller.\nسرچ جهت اطلاعات بیشتر: Flyback auxiliary winding voltage' },
            { id: 'Iaux', label: 'Iaux (جریان سیم‌پیچ کمکی)', val: 0.1, unit: 'A', group: 'electrical', tooltip: 'Continuous current consumed by the control logic.\nسرچ جهت اطلاعات بیشتر: Primary controller supply current' },
            { id: 'eff', label: 'eff (راندمان پیش‌بینی شده)', val: 0.80, unit: 'Ratio', group: 'electrical', tooltip: 'Target efficiency parameter for converter losses evaluation.\nسرچ جهت اطلاعات بیشتر: DC-DC efficiency' },
            { id: 'Kr', label: 'Kr (ضریب ریپل جریان)', val: 0.4, unit: 'Ratio', group: 'electrical', tooltip: 'Ripple current target ratio.\nسرچ جهت اطلاعات بیشتر: Inductor current ripple factor Kr' },
            { id: 'Dmax', label: 'Dmax (حداکثر دیوتی سایکل هدف)', val: 0.45, unit: 'Ratio', group: 'electrical', tooltip: 'Maximum ON duty cycle goal.\nسرچ جهت اطلاعات بیشتر: Flyback maximum duty cycle limit' },
            
            // Group 2: Magnetics
            { id: 'Ae', label: 'Ae (سطح مقطع موثر هسته)', val: 118, unit: 'mm²', group: 'magnetics', tooltip: 'Cross-sectional flux area of the core.\nسرچ جهت اطلاعات بیشتر: Ferrite effective area Ae' },
            { id: 'Aw', label: 'Aw (مساحت پنجره بوبین)', val: 85, unit: 'mm²', group: 'magnetics', tooltip: 'Bobbin copper winding area.\nسرچ جهت اطلاعات بیشتر: Bobbin window area Aw' },
            { id: 'Bmax', label: 'Bmax (حداکثر چگالی شار کاری)', val: 0.25, unit: 'Tesla', group: 'magnetics', tooltip: 'Maximum working flux limit.\nسرچ جهت اطلاعات بیشتر: Ferrite saturation flux density' },
            { id: 'J', label: 'J (چگالی جریان سیم‌ها)', val: 5.0, unit: 'A/mm²', group: 'magnetics', tooltip: 'Current capacity density per unit area of copper.\nسرچ جهت اطلاعات بیشتر: Transformer wire current density J' },

            // Group 3: MOSFET Switch Specs
            { id: 'Vds_max', label: 'Vds_max (ولتاژ حد درین-سورس)', val: 100, unit: 'V', group: 'mosfet', tooltip: 'MOSFET drain-source maximum voltage limit from datasheet.\nسرچ جهت اطلاعات بیشتر: MOSFET Vds breakdown rating' },
            { id: 'Rds_on', label: 'Rds_on (مقاومت کانال روشن)', val: 0.045, unit: 'Ω', group: 'mosfet', tooltip: 'MOSFET active channel resistance.\nسرچ جهت اطلاعات بیشتر: MOSFET Rds_on' },
            { id: 'Ids_max', label: 'Ids_max (حداکثر جریان درین)', val: 40.0, unit: 'A', group: 'mosfet', tooltip: 'MOSFET continuous current limit.\nسرچ جهت اطلاعات بیشتر: MOSFET continuous drain current Ids' }
        ]
    },
    charger: {
        title: "شارژر هوشمند باتری با آنالیز بی‌باری (Smart Battery Charger)",
        intro: "مخصوص طراحی شارژرهای هوشمند الکترونیکی. مانند مبدل AC-DC، این مدار هم پیش از باس DC اصلی از یک پل دیود و خازن صافی ورودی عبور می‌کند که ظرفیت آن در همین تب محاسبه می‌شود. در حین شارژ، ولتاژ باتری به شدت تغییر می‌کند و در زمان دشارژ کامل، ولتاژ به شدت کاهش می‌یابد که این کاهش می‌تواند تغذیه آی‌سی را با خطر سقوط ولتاژ روبرو سازد.",
        inputs: [
            // Group 1: Electrical Specs
            { id: 'Vac_min', label: 'Vac_min (حداقل ولتاژ AC ورودی)', val: 185, unit: 'V', group: 'electrical', tooltip: 'Minimum AC mains RMS voltage feeding the rectifier + filter capacitor ahead of the DC bus.\nسرچ جهت اطلاعات بیشتر: Flyback bulk capacitor Vac_min' },
            { id: 'Vac_max', label: 'Vac_max (حداکثر ولتاژ AC ورودی)', val: 265, unit: 'V', group: 'electrical', tooltip: 'Maximum AC mains RMS voltage feeding the rectifier + filter capacitor ahead of the DC bus.\nسرچ جهت اطلاعات بیشتر: Flyback bulk capacitor Vac_max' },
            { id: 'f_line', label: 'f_line (فرکانس برق شبکه)', val: 50, unit: 'Hz', group: 'electrical', tooltip: 'Mains network frequency, used to size the input filter capacitor ripple. 50Hz for Iran/Europe or 60Hz for US.\nسرچ جهت اطلاعات بیشتر: Mains grid line frequency' },
            { id: 'Vin_min', label: 'Vin_min (حداقل ولتاژ مستقیم ورودی)', val: 240, unit: 'V', group: 'electrical', tooltip: 'Minimum value of primary DC bus voltage, after the bridge rectifier and filter capacitor.\nسرچ جهت اطلاعات بیشتر: High-voltage DC bus filter' },
            { id: 'Vin_max', label: 'Vin_max (حداکثر ولتاژ مستقیم ورودی)', val: 375, unit: 'V', group: 'electrical', tooltip: 'Maximum value of primary DC bus voltage.\nسرچ جهت اطلاعات بیشتر: High-voltage DC bus calculation' },
            { id: 'Vfloat', label: 'Vfloat (ولتاژ فول‌شارژ باتری)', val: 14.4, unit: 'V', group: 'electrical', tooltip: 'End of charge (CV mode) constant output voltage.\nسرچ جهت اطلاعات بیشتر: Battery float charge voltage Vfloat' },
            { id: 'Vcutoff', label: 'Vcutoff (ولتاژ دشارژ بحرانی باتری)', val: 9.0, unit: 'V', group: 'electrical', tooltip: 'Minimum deeply discharged battery voltage where charger must still operate.\nسرچ جهت اطلاعات بیشتر: Battery deep discharge threshold' },
            { id: 'Icharge', label: 'Icharge (جریان شارژ ثابت)', val: 4, unit: 'A', group: 'electrical', tooltip: 'Maximum current injected during Constant Current (CC) mode.\nسرچ جهت اطلاعات بیشتر: Constant Current battery charge calculation' },
            { id: 'Vf', label: 'Vf (افت ولتاژ دیود ثانویه)', val: 0.7, unit: 'V', group: 'electrical', tooltip: 'Forward barrier drop of Schottky diode.\nسرچ جهت اطلاعات بیشتر: Schottky diode Vf drop' },
            { id: 'fsw', label: 'fsw (فرکانس سوئیچینگ)', val: 65000, unit: 'Hz', group: 'electrical', tooltip: 'Operating PWM switching frequency in full load.\nسرچ جهت اطلاعات بیشتر: Flyback switching frequency' },
            { id: 'Vaux_nom', label: 'Vaux_nom (ولتاژ نامی سیم‌پیچ کمکی)', val: 15, unit: 'V', group: 'electrical', tooltip: 'Nominal supply voltage of primary IC at fully charged battery status.\nسرچ جهت اطلاعات بیشتر: Flyback auxiliary winding design' },
            { id: 'Vaux_uvlo', label: 'Vaux_uvlo (ولتاژ قطع UVLO آی‌سی)', val: 9.0, unit: 'V', group: 'electrical', tooltip: 'Under Voltage Lockout threshold of PWM controller IC.\nسرچ جهت اطلاعات بیشتر: Under Voltage Lockout UVLO' },
            { id: 'Iaux', label: 'Iaux (جریان کمکی مصرفی آی‌سی)', val: 0.08, unit: 'A', group: 'electrical', tooltip: 'Current consumed by primary IC control circuits.\nسرچ جهت اطلاعات بیشتر: Primary controller supply current' },
            { id: 'fsw_min', label: 'fsw_min (حداقل فرکانس بی‌باری)', val: 150, unit: 'Hz', group: 'electrical', tooltip: 'Minimum frequency during burst mode at no-load/full charge condition.\nسرچ جهت اطلاعات بیشتر: Burst mode fsw_min' },
            { id: 'Ipeak_min_ratio', label: 'Ipeak_ratio (نسبت حداقل جریان پیک)', val: 0.25, unit: 'Ratio', group: 'electrical', tooltip: 'Minimum internal current limit peak ratio during low-power modes.\nسرچ جهت اطلاعات بیشتر: Burst mode peak current limit ratio' },
            { id: 'eff', label: 'eff (راندمان پیش‌بینی شده)', val: 0.83, unit: 'Ratio', group: 'electrical', tooltip: 'Target converter efficiency estimation.\nسرچ جهت اطلاعات بیشتر: Battery charger efficiency' },
            { id: 'Kr', label: 'Kr (ضریب ریپل جریان)', val: 0.4, unit: 'Ratio', group: 'electrical', tooltip: 'Ripple current target ratio.\nسرچ جهت اطلاعات بیشتر: Inductor current ripple factor Kr' },
            { id: 'Dmax', label: 'Dmax (حداکثر دیوتی سایکل هدف)', val: 0.45, unit: 'Ratio', group: 'electrical', tooltip: 'Maximum ON duty cycle goal.\nسرچ جهت اطلاعات بیشتر: Flyback maximum duty cycle limit' },
            
            // Group 2: Magnetics
            { id: 'Ae', label: 'Ae (سطح مقطع موثر هسته)', val: 118, unit: 'mm²', group: 'magnetics', tooltip: 'Cross-sectional flux area of the core.\nسرچ جهت اطلاعات بیشتر: Ferrite effective area Ae' },
            { id: 'Aw', label: 'Aw (مساحت پنجره بوبین)', val: 85, unit: 'mm²', group: 'magnetics', tooltip: 'Bobbin copper winding area.\nسرچ جهت اطلاعات بیشتر: Bobbin window area Aw' },
            { id: 'Bmax', label: 'Bmax (حداکثر چگالی شار کاری)', val: 0.25, unit: 'Tesla', group: 'magnetics', tooltip: 'Maximum working flux limit.\nسرچ جهت اطلاعات بیشتر: Ferrite saturation flux density' },
            { id: 'J', label: 'J (چگالی جریان سیم‌ها)', val: 4.5, unit: 'A/mm²', group: 'magnetics', tooltip: 'Current capacity density per unit area of copper.\nسرچ جهت اطلاعات بیشتر: Transformer wire current density J' },

            // Group 3: MOSFET Switch Specs
            { id: 'Vds_max', label: 'Vds_max (ولتاژ حد درین-سورس)', val: 800, unit: 'V', group: 'mosfet', tooltip: 'MOSFET drain-source maximum voltage limit from datasheet.\nسرچ جهت اطلاعات بیشتر: MOSFET Vds breakdown rating' },
            { id: 'Rds_on', label: 'Rds_on (مقاومت کانال روشن)', val: 1.10, unit: 'Ω', group: 'mosfet', tooltip: 'MOSFET active channel resistance.\nسرچ جهت اطلاعات بیشتر: MOSFET Rds_on' },
            { id: 'Ids_max', label: 'Ids_max (حداکثر جریان درین)', val: 15.0, unit: 'A', group: 'mosfet', tooltip: 'MOSFET continuous current limit.\nسرچ جهت اطلاعات بیشتر: MOSFET continuous drain current Ids' }
        ]
    }
};

const coreData = {
    custom: { ae: '', aw: '' },
    EE13: { ae: 17.1, aw: 14.5 },
    EE16: { ae: 19.3, aw: 22.0 },
    EE19: { ae: 22.8, aw: 28.0 },
    EE22: { ae: 42.0, aw: 33.0 },
    EE25: { ae: 41.0, aw: 39.5 },
    EE30: { ae: 109.0, aw: 80.0 },
    EE33: { ae: 118.0, aw: 112.0 },
    EE35: { ae: 103.0, aw: 122.0 },
    EE40: { ae: 127.0, aw: 154.0 },
    EE42: { ae: 181.0, aw: 176.0 },
    EE55: { ae: 354.0, aw: 250.0 },
    EFD15: { ae: 15.0, aw: 18.5 },
    EFD20: { ae: 31.0, aw: 29.0 },
    EFD25: { ae: 58.0, aw: 46.0 },
    EFD30: { ae: 69.0, aw: 57.0 },
    PQ2016: { ae: 62.0, aw: 28.0 },
    PQ2020: { ae: 62.0, aw: 41.0 },
    PQ2620: { ae: 118.0, aw: 65.0 },
    PQ2625: { ae: 118.0, aw: 85.0 },
    PQ3220: { ae: 153.0, aw: 81.0 },
    PQ3230: { ae: 153.0, aw: 120.0 },
    RM6: { ae: 37.0, aw: 24.0 },
    RM8: { ae: 64.0, aw: 38.0 },
    RM10: { ae: 98.0, aw: 51.0 },
    RM12: { ae: 146.0, aw: 73.0 }
};

let currentTab = 'acdc';
window.lastCalculationResults = null;

// Highlight and focus an input or scroll and shake/pulse an output card with cyan glow
window.highlightAndFocusInput = function(id) {
    // If modal is open, close it first to allow focus visibility
    window.closeMathModal();

    const inputEl = document.getElementById(id);
    if (inputEl) {
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputEl.classList.add('turquoise-pulse-active');
        inputEl.focus();
        setTimeout(() => {
            inputEl.classList.remove('turquoise-pulse-active');
        }, 1600);
        return;
    }

    // If it's an output variable, find the parent output card or output-wrapper and highlight it with the pulsing cyan box!
    const outputContainers = document.querySelectorAll('.output-card');
    for (let card of outputContainers) {
        if (card.innerHTML.includes(`openMathModal('${id}')`) || card.innerHTML.includes(`openMathModal(\'${id}\')`) || card.innerHTML.includes(`openMathModal("${id}")`)) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('turquoise-pulse-active');
            setTimeout(() => {
                card.classList.remove('turquoise-pulse-active');
            }, 1600);
            break;
        }
    }
};

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const tabElement = document.getElementById(`tab-${tabName}`);
    if (tabElement) tabElement.classList.add('active');

    const config = tabConfigs[tabName];
    const introDiv = document.getElementById('tab-intro');
    
    let borderClass = 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    if (tabName === 'charger') borderClass = 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    else if (tabName === 'dcdc') borderClass = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    
    introDiv.className = `p-4 rounded-xl border ${borderClass} text-xs leading-relaxed text-right`;
    introDiv.innerHTML = `<strong class="block text-sm mb-1 font-bold">${config.title}</strong>${config.intro}`;

    const coreSelector = document.getElementById('core-selector');
    if (coreSelector) coreSelector.value = 'PQ2625';

    // Show or hide the C_bulk Toggle depending on active tab (AC-DC specific element)
    const cbulkToggleWrapper = document.getElementById('cbulk-toggle-wrapper');
    if (cbulkToggleWrapper) {
        if (tabName === 'acdc' || tabName === 'charger') {
            cbulkToggleWrapper.classList.remove('hidden');
        } else {
            cbulkToggleWrapper.classList.add('hidden');
        }
    }

    renderInputsGrouped(config.inputs);
    fetchCalculations();
}

function handleCoreSelect() {
    const coreSelector = document.getElementById('core-selector');
    if (!coreSelector) return;
    
    const coreKey = coreSelector.value;
    const data = coreData[coreKey];
    if (coreKey !== 'custom' && data) {
        const aeInput = document.getElementById('Ae');
        const awInput = document.getElementById('Aw');
        if (aeInput) aeInput.value = data.ae;
        if (awInput) awInput.value = data.aw;

        // Bmax is a property of the ferrite MATERIAL/grade (e.g. PC40, N87, 3C90)
        // and the switching frequency, not of the core's physical shape/size -
        // so it can't be derived from Ae/Aw the way they can. We auto-fill a
        // safe general-purpose default (0.25T, typical for ~65kHz power ferrite)
        // whenever a standard core is chosen, same as Ae/Aw, but it stays a
        // normal editable field so it can be corrected against the actual
        // datasheet Bsat of the chosen ferrite grade. In "Custom" mode it is
        // left untouched for fully manual entry.
        const bmaxInput = document.getElementById('Bmax');
        if (bmaxInput) bmaxInput.value = 0.25;
    }
    fetchCalculations();
}

function toggleAuxWinding() {
    const hasAuxCheckbox = document.getElementById('has-aux-checkbox');
    const hasAux = hasAuxCheckbox ? hasAuxCheckbox.checked : true;
    const idsToToggle = ['Vaux', 'Iaux', 'Vaux_nom', 'Vaux_uvlo'];
    
    idsToToggle.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.disabled = !hasAux;
            if (!hasAux) {
                input.classList.add('opacity-40');
            } else {
                input.classList.remove('opacity-40');
            }
        }
    });
    fetchCalculations();
}

function toggleSnubberCircuit() {
    const hasSnubberCheckbox = document.getElementById('has-snubber-checkbox');
    const hasSnubber = hasSnubberCheckbox ? hasSnubberCheckbox.checked : true;
    const snubGroup = document.getElementById('snubber-svg-group');
    if (snubGroup) {
        if (hasSnubber) {
            snubGroup.classList.remove('hidden');
        } else {
            snubGroup.classList.add('hidden');
            const flowDotSnub = document.getElementById('flow-dot-snub');
            if (flowDotSnub) flowDotSnub.classList.add('hidden');
        }
    }
    fetchCalculations();
}

window.toggleCBulkWinding = function() {
    const hasC_bulkCheckbox = document.getElementById('has-cbulk-checkbox');
    const hasC_bulk = hasC_bulkCheckbox ? hasC_bulkCheckbox.checked : true;
    const cBulkGroup = document.getElementById('c-bulk-svg-group');
    if (cBulkGroup) {
        if (hasC_bulk && (currentTab === 'acdc' || currentTab === 'charger')) {
            cBulkGroup.classList.remove('hidden');
        } else {
            cBulkGroup.classList.add('hidden');
        }
    }
}

function renderInputsGrouped(inputs) {
    const groupElectrical = document.getElementById('group-electrical');
    const groupMagnetics = document.getElementById('group-magnetics');
    const groupMosfet = document.getElementById('group-mosfet');

    if (groupElectrical) groupElectrical.innerHTML = '';
    if (groupMagnetics) groupMagnetics.innerHTML = '';
    if (groupMosfet) groupMosfet.innerHTML = '';
    
    inputs.forEach(input => {
        const grp = document.createElement('div');
        grp.className = 'grid grid-cols-1 sm:grid-cols-12 gap-2 items-center';
        
        const labelContainer = document.createElement('div');
        labelContainer.className = 'sm:col-span-8 flex items-center justify-between';
        
        const label = document.createElement('label');
        label.className = 'text-xs text-slate-300 font-semibold';
        label.innerText = label.textContent = input.label;
        
        const tooltipWrapper = document.createElement('div');
        tooltipWrapper.className = 'tooltip-container ml-1';
        
        const tooltipIcon = document.createElement('span');
        tooltipIcon.className = 'tooltip-trigger';
        
        const tooltipSpan = document.createElement('span');
        tooltipSpan.className = 'custom-tooltip';
        tooltipSpan.innerText = input.tooltip;
        
        tooltipWrapper.appendChild(tooltipIcon);
        tooltipWrapper.appendChild(tooltipSpan);
        labelContainer.appendChild(label);
        labelContainer.appendChild(tooltipWrapper);
        
        const inputDiv = document.createElement('div');
        inputDiv.className = 'sm:col-span-4 relative flex items-center justify-center';
        
        const inputEl = document.createElement('input');
        inputEl.type = 'number';
        inputEl.id = input.id;
        inputEl.value = input.val;
        inputEl.step = 'any';
        inputEl.className = 'input-field w-full rounded-lg px-2.5 py-1.5 text-xs text-slate-200 border border-slate-700 text-center focus:bg-slate-950 transition-all duration-150';
        inputEl.addEventListener('input', () => {
            if (input.id === 'Ae' || input.id === 'Aw') {
                const coreSelector = document.getElementById('core-selector');
                if (coreSelector) coreSelector.value = 'custom';
            }
            fetchCalculations();
        });

        const unitSpan = document.createElement('span');
        unitSpan.className = 'absolute left-2.5 text-[10px] text-slate-500 pointer-events-none font-semibold';
        unitSpan.innerText = input.unit;
        
        inputDiv.appendChild(inputEl);
        inputDiv.appendChild(unitSpan);
        grp.appendChild(labelContainer);
        grp.appendChild(inputDiv);

        if (input.group === 'electrical' && groupElectrical) {
            groupElectrical.appendChild(grp);
        } else if (input.group === 'magnetics' && groupMagnetics) {
            groupMagnetics.appendChild(grp);
        } else if (input.group === 'mosfet' && groupMosfet) {
            groupMosfet.appendChild(grp);
        }
    });

    toggleAuxWinding();
    toggleSnubberCircuit();
    window.toggleCBulkWinding();
}

function fetchCalculations() {
    const inputsData = {};
    const config = tabConfigs[currentTab];
    
    config.inputs.forEach(input => {
        const el = document.getElementById(input.id);
        if (el) {
            inputsData[input.id] = parseFloat(el.value) || 0;
        }
    });

    const hasAuxCheckbox = document.getElementById('has-aux-checkbox');
    const hasSnubberCheckbox = document.getElementById('has-snubber-checkbox');
    const modeSelector = document.getElementById('mode-selector');

    inputsData['has_aux'] = hasAuxCheckbox ? (hasAuxCheckbox.checked ? 1 : 0) : 1;
    inputsData['has_snubber'] = hasSnubberCheckbox ? (hasSnubberCheckbox.checked ? 1 : 0) : 1;
    inputsData['mode'] = modeSelector ? modeSelector.value : 'auto';

    fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: currentTab, inputs: inputsData })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.results) {
            window.lastCalculationResults = data.results;
            updateUI(data.results);
        } else {
            console.error("Calculation failed on server:", data.error);
        }
    })
    .catch(err => console.error("Error connecting to server core:", err));
}

// توضیح کوتاه هر پارامتر خروجی، دقیقاً با همان سبک راهنمای مقادیر ورودی (آیکون ⓘ با تولتیپ روی هاور)
// تا کاربر با نگه‌داشتن نشانگر روی هر خروجی، بفهمد آن مقدار دقیقاً چه چیزی را نشان می‌دهد.
const OUTPUT_TOOLTIPS = {
    C_bulk: 'Calculated raw value of the input rectifier filter capacitor, sized from the mains ripple equation.\nسرچ جهت اطلاعات بیشتر: Bulk capacitor ripple sizing',
    Pin: 'Total input power drawn from the DC bus, including losses through the target efficiency.\nسرچ جهت اطلاعات بیشتر: Flyback input power Pin',
    Lp_uH: 'Primary-side magnetizing inductance required to meet the ripple/duty-cycle targets.\nسرچ جهت اطلاعات بیشتر: Flyback primary inductance Lp',
    D_real: 'Actual realized ON-time duty cycle once winding turns are rounded to whole numbers.\nسرچ جهت اطلاعات بیشتر: Flyback realized duty cycle',
    Np: 'Number of primary winding turns computed from the target flux and inductance.\nسرچ جهت اطلاعات بیشتر: Transformer primary turns Np',
    Ns: 'Number of secondary winding turns computed from the turns ratio.\nسرچ جهت اطلاعات بیشتر: Transformer secondary turns Ns',
    Naux: 'Number of auxiliary winding turns needed to self-power the controller IC.\nسرچ جهت اطلاعات بیشتر: Transformer auxiliary turns',
    Vro_real: 'Actual reflected output voltage seen on the primary side once turns are rounded.\nسرچ جهت اطلاعات بیشتر: Flyback reflected voltage Vor',
    V_stress: 'Peak drain-source voltage stress the MOSFET must withstand, including leakage spike/clamp.\nسرچ جهت اطلاعات بیشتر: Flyback MOSFET Vds stress',
    I_rms_pri: 'RMS current flowing through the primary winding, used to size the wire diameter.\nسرچ جهت اطلاعات بیشتر: Transformer primary RMS current',
    D_wire_pri: 'Minimum bare copper wire diameter for the primary, based on target current density J.\nسرچ جهت اطلاعات بیشتر: Transformer wire gauge sizing',
    D_wire_sec: 'Minimum bare copper wire diameter for the secondary, based on target current density J.\nسرچ جهت اطلاعات بیشتر: Transformer wire gauge sizing',
    P_loss_mosfet: 'Total conduction plus switching losses dissipated in the MOSFET.\nسرچ جهت اطلاعات بیشتر: MOSFET conduction and switching loss',
    B_real: 'Actual peak magnetic flux density reached in the core at full load.\nسرچ جهت اطلاعات بیشتر: Ferrite core flux density B',
    AirGap: 'Required center-leg air gap length to store the target energy without saturating.\nسرچ جهت اطلاعات بیشتر: Ferrite core air gap sizing',
    FillFactor: 'Fraction of the bobbin window area filled by all windings combined.\nسرچ جهت اطلاعات بیشتر: Bobbin winding fill factor',
    R_snub: 'RCD snubber resistor value that clamps leakage-inductance voltage spikes.\nسرچ جهت اطلاعات بیشتر: Flyback RCD snubber design',
    C_snub_nF: 'RCD snubber capacitor value that sets the clamp voltage ripple.\nسرچ جهت اطلاعات بیشتر: Flyback RCD snubber design',
    P_snub: 'Power dissipated in the snubber resistor from leakage-inductance energy.\nسرچ جهت اطلاعات بیشتر: Flyback snubber power dissipation',
    V_clamp: 'Clamped peak voltage on the primary switch node set by the snubber network.\nسرچ جهت اطلاعات بیشتر: Flyback clamp voltage',
    P_burst_min: 'Minimum energy delivered per switching cycle at the no-load burst-mode frequency.\nسرچ جهت اطلاعات بیشتر: Flyback burst mode minimum power',
    R_dummy: 'Recommended dummy load resistor to prevent output voltage runaway at no-load/full-charge.\nسرچ جهت اطلاعات بیشتر: Flyback dummy load resistor',
    Vaux_min_working: 'Lowest auxiliary supply voltage expected when the battery is at its deep-discharge cutoff.\nسرچ جهت اطلاعات بیشتر: Flyback auxiliary UVLO margin'
};

function outputTooltipHTML(key) {
    const note = OUTPUT_TOOLTIPS[key];
    if (!note) return '';
    return `
        <span class="tooltip-container">
            <span class="tooltip-trigger"></span>
            <span class="custom-tooltip">${note}</span>
        </span>
    `;
}

// Generates click-activated triggers instead of buggy hover tooltips
function createMathTooltipHTML(res, key, displayVal, colorClass = "text-blue-400") {
    const eq = res.equations && res.equations[key];
    if (!eq) {
        return `<span class="output-value ${colorClass} font-bold font-mono">${displayVal}</span>`;
    }

    return `
        <span onclick="openMathModal('${key}')" class="output-value ${colorClass} font-bold font-mono cursor-pointer border-b border-dashed border-slate-600/80 pb-0.5 hover:border-blue-400 hover:text-blue-400 transition-all" title="جهت مشاهده محاسبات علمی کلیک کنید">
            ${displayVal}
        </span>
    `;
}

// دلیل فنی گرد شدن هر مقدار محاسباتی به سمت نزدیک‌ترین مقدار واقعی و عملی موجود در بازار،
// جهت نمایش در تولتیپ کنار همان مقدار (به‌جای یک بلوک جدا در انتهای صفحه)
const practicalNotes = {
    D_wire_pri_practical: 'نزدیک‌ترین قطر استاندارد سیم مسی لاکی (Enamelled Wire) موجود در بازار که برابر یا بزرگتر از مقدار محاسباتی است، تا از افت کیفیت جریان‌دهی جلوگیری شود.',
    D_wire_sec_practical: 'نزدیک‌ترین قطر استاندارد سیم مسی لاکی موجود در بازار که برابر یا بزرگتر از مقدار محاسباتی است.',
    C_bulk_practical: 'برای پوشش تلورانس معمول خازن‌های الکترولیتی (±20٪) و افت ظرفیت با گذر زمان و دما، دو برابر مقدار محاسبه‌شده به نزدیک‌ترین پله موجود در کاتالوگ بازار (مثلاً 100, 220, 470µF) گرد شده است.',
    R_snub_practical: 'نزدیک‌ترین مقدار موجود در سری استاندارد مقاومت‌های E24 (مثلاً 100Ω به‌جای 99Ω) که در بازار به‌سادگی قابل خریداری است.',
    C_snub_practical_nF: 'مقدار محاسباتی به سمت بالا و به نزدیک‌ترین پله سری استاندارد خازن‌های E12 گرد شده تا از تخلیه کامل انرژی نشتی اطمینان حاصل شود.',
    R_dummy_practical: 'مقدار محاسباتی به سمت پایین و به نزدیک‌ترین مقاومت استاندارد E24 گرد شده تا بار کاذب کمی بیشتر از حداقل نیاز باشد و عملکرد تضمین شود.'
};

// چیپ کوچک مقدار عملی/استاندارد بازار، درست کنار خودِ مقدار محاسباتی (به‌جای یک کارت جدا در انتهای نتایج)
function createPracticalBadgeHTML(res, key) {
    const p = res.practical;
    if (!p || p[key] === undefined) return '';
    const eq = res.equations && res.equations[key];
    const displayVal = eq ? eq.result : '';
    const note = practicalNotes[key] || 'نزدیک‌ترین مقدار استاندارد و در دسترس بازار.';

    return `
        <span class="tooltip-container">
            <button type="button" onclick="openMathModal('${key}')" class="tooltip-trigger flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:text-blue-200 text-[10px] font-mono px-2 py-0.5 rounded-lg transition-all cursor-pointer">
                استاندارد: ${displayVal}
            </button>
            <span class="custom-tooltip">${note}</span>
        </span>
    `;
}

// Interactive Click-to-Open Modal System for Perfect UI Control
window.openMathModal = function(key) {
    if (!window.lastCalculationResults) return;
    const eq = window.lastCalculationResults.equations && window.lastCalculationResults.equations[key];
    if (!eq) return;

    window.closeMathModal();

    // Create Modal Backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.id = 'math-modal-backdrop';
    backdrop.className = 'modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            window.closeMathModal();
        }
    });

    // Create Modal Main Panel
    const modal = document.createElement('div');
    modal.className = 'modal-content bg-slate-900 border border-slate-800 rounded-3xl p-6 w-[95vw] sm:w-[780px] md:w-[850px] text-right shadow-2xl relative max-h-[90vh] overflow-y-auto';

    // Header Structure
    const header = document.createElement('div');
    header.className = 'font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between gap-2';
    
    const title = document.createElement('span');
    title.className = 'text-blue-400 font-bold flex items-center gap-1.5 text-sm font-sans';
    title.innerHTML = `🧮 تحلیل فیزیکی و اثبات محاسباتی`;

    const codeBadge = document.createElement('span');
    codeBadge.className = 'text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono';
    codeBadge.innerText = key;

    header.appendChild(title);
    header.appendChild(codeBadge);
    modal.appendChild(header);

    // Dynamic LaTeX Equation Display with Responsive scroll features
    const eqBlock = document.createElement('div');
    eqBlock.className = 'space-y-4 text-[11px] font-sans';

    const formulaTitle = document.createElement('span');
    formulaTitle.className = 'text-blue-300 block font-semibold text-xs mb-1.5 font-sans';
    formulaTitle.innerText = '📐 فرمول ریاضی مرجع (Classical Textbook LaTeX):';
    eqBlock.appendChild(formulaTitle);

    // Dynamic Math container applying the responsive classes from custom.css
    const mathContainer = document.createElement('div');
    mathContainer.className = 'formula-container ltr-formula text-center shadow-inner rounded-xl bg-slate-950/60 border border-slate-800/80 p-2 sm:p-4 mb-4';
    
    try {
        if (typeof katex !== 'undefined') {
            katex.render(eq.math_formula || eq.formula, mathContainer, {
                displayMode: true,
                throwOnError: false
            });
        } else {
            mathContainer.innerText = eq.math_formula || eq.formula;
        }
    } catch (err) {
        console.error("KaTeX compile crash:", err);
        mathContainer.innerText = eq.math_formula || eq.formula;
    }
    eqBlock.appendChild(mathContainer);

    // Grid details block
    const grids = document.createElement('div');
    grids.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

    // Python syntax structure
    const pSyntax = document.createElement('div');
    pSyntax.innerHTML = `
        <span class="text-orange-400 block font-semibold text-[11px] mb-1 font-sans">💻 فرمول محاسباتی مفسر:</span>
        <code class="bg-slate-950 border border-slate-800/60 px-2.5 py-2.5 rounded-lg block overflow-x-auto text-blue-400 select-all font-mono text-[10px] ltr-formula">${eq.formula}</code>
    `;
    
    // Substituted live physics values
    const pSub = document.createElement('div');
    pSub.innerHTML = `
        <span class="text-emerald-400 block font-semibold text-[11px] mb-1 font-sans">🔍 جایگذاری فیزیکی مقادیر:</span>
        <code class="bg-slate-950 border border-slate-800/60 px-2.5 py-2.5 rounded-lg block overflow-x-auto text-emerald-400 select-all font-mono text-[10px] ltr-formula">${eq.substituted}</code>
    `;

    grids.appendChild(pSyntax);
    grids.appendChild(pSub);
    eqBlock.appendChild(grids);

    // Interactive Related Variables Block (Accurate mapping verification with active live display values!)
    const relatedVars = eq.related_vars || [];
    if (relatedVars.length > 0) {
        const relDiv = document.createElement('div');
        relDiv.className = 'border-t border-slate-800/60 pt-3.5 mt-3';
        
        const relTitle = document.createElement('span');
        relTitle.className = 'text-blue-300 block font-semibold text-[10px] mb-2 font-sans';
        relTitle.innerText = '🎛️ پارامترهای فنی مرتبط و مقدار لحظه‌ای آن‌ها (کلیک جهت آنالیز متقابل):';
        relDiv.appendChild(relTitle);

        const badgeWrapper = document.createElement('div');
        badgeWrapper.className = 'flex flex-wrap gap-1.5 justify-start';

        relatedVars.forEach(v => {
            // Intelligent disambiguation: verify if the parameter exists as an active input in the current tab config first
            const isInput = tabConfigs[currentTab].inputs.some(inp => inp.id === v);
            const isOutput = !isInput && window.lastCalculationResults.equations && (v in window.lastCalculationResults.equations);
            const btn = document.createElement('button');
            
            if (isOutput) {
                const subEq = window.lastCalculationResults.equations[v];
                const eqValue = subEq ? subEq.result : '';
                btn.className = 'bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 px-2.5 py-1 rounded-xl text-[10px] text-red-200 hover:text-white transition-all font-sans flex items-center gap-1 cursor-pointer';
                btn.innerHTML = `<span class="font-mono text-[9px] bg-red-900/50 px-1 rounded text-red-300 font-semibold">${v}</span> <span>📊 فرمول (${eqValue})</span>`;
                btn.onclick = () => window.switchMathModal(v);
            } else {
                const inputConfig = tabConfigs[currentTab].inputs.find(inp => inp.id === v);
                let labelText = v;
                let inputVal = '';
                let inputUnit = '';
                if (inputConfig) {
                    const parts = inputConfig.label.split('/');
                    labelText = parts.length > 1 ? parts[1].trim() : parts[0].trim();
                    labelText = labelText.replace(/\(.*\)/, '').trim();
                    inputUnit = inputConfig.unit || '';
                }
                const inputEl = document.getElementById(v);
                if (inputEl) {
                    inputVal = parseFloat(inputEl.value) || 0;
                }
                btn.className = 'bg-blue-950/60 hover:bg-blue-900 border border-blue-500/20 hover:border-blue-500/50 px-2.5 py-1 rounded-xl text-[10px] text-blue-200 hover:text-white transition-all font-sans flex items-center gap-1 cursor-pointer';
                btn.innerHTML = `<span class="font-mono text-[9px] bg-blue-900/40 px-1 rounded text-blue-400 font-semibold">${v}</span> <span>${labelText} (${inputVal} ${inputUnit})</span>`;
                btn.onclick = () => window.highlightAndFocusInput(v);
            }
            badgeWrapper.appendChild(btn);
        });
        relDiv.appendChild(badgeWrapper);
        eqBlock.appendChild(relDiv);
    }

    // Modal Footer Summary Block
    const footer = document.createElement('div');
    footer.className = 'border-t border-slate-800 pt-3.5 mt-3.5 flex justify-between items-center font-sans';
    footer.innerHTML = `
        <span class="text-red-400 font-bold text-xs">خروجی نهایی محاسبه شده:</span>
        <span class="text-white font-bold font-mono text-sm bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">${eq.result}</span>
    `;
    eqBlock.appendChild(footer);
    modal.appendChild(eqBlock);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-4 left-4 text-slate-400 hover:text-white text-md font-bold transition-colors cursor-pointer';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = window.closeMathModal;
    modal.appendChild(closeBtn);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
};

window.closeMathModal = function() {
    const backdrop = document.getElementById('math-modal-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
};

window.switchMathModal = function(key) {
    window.closeMathModal();
    setTimeout(() => {
        window.openMathModal(key);
    }, 100);
};

function updateUI(res) {
    const warningsPanel = document.getElementById('safety-warnings');
    const warningsList = document.getElementById('warnings-list');
    
    if (warningsPanel && warningsList) {
        if (res.warnings && res.warnings.length > 0) {
            warningsPanel.classList.remove('hidden');
            warningsList.innerHTML = res.warnings.map(w => `<li class="pb-1">${w}</li>`).join('');
        } else {
            warningsPanel.classList.add('hidden');
        }
    }

    const modeBadge = document.getElementById('live-mode-badge');
    if (modeBadge) {
        const mode_label = res.is_dcm ? "Discontinuous (DCM)" : "Continuous (CCM)";
        const mode_color = res.is_dcm ? "bg-blue-500/20 text-blue-300 border-blue-500/50" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
        
        modeBadge.className = `px-3 py-1 rounded-full text-xs font-bold font-mono border ${mode_color}`;
        modeBadge.innerText = mode_label;
    }

    const flowDotPri = document.getElementById('flow-dot-pri');
    const flowDotSec = document.getElementById('flow-dot-sec');
    if (flowDotPri) flowDotPri.classList.remove('hidden');
    if (flowDotSec) flowDotSec.classList.remove('hidden');

    updateSchematicInteractive(res.D_real, res.has_snubber);
    updateSchematicValues(res);
    window.toggleCBulkWinding();

    drawWaveforms(res.is_dcm, res.D_real, res.D_sec, res.I_peak_pri, res.I_valley_pri, res.I_peak_sec, res.I_valley_sec);

    let snubberCardHTML = '';
    if (res.has_snubber) {
        snubberCardHTML = `
            <div class="output-card border-r-blue-500 bg-slate-900/70 backdrop-blur-md border border-slate-800/70 rounded-2xl p-5 shadow-lg text-right">
                <h3 class="text-sm font-bold text-white mb-4 flex justify-between items-center">
                    <span>۲. محاسبات مدار فیلتر اسنابر کلمپ (RCD Snubber Network)</span>
                    <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">کاهش استرس سوئیچ</span>
                </h3>
                <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                    <span class="text-xs text-slate-400 inline-flex items-center">مقاومت بهینه اسنابر (R_snub):${outputTooltipHTML('R_snub')}</span>
                    <span class="flex items-center gap-2">
                        ${createMathTooltipHTML(res, 'R_snub', res.R_snub.toFixed(0) + " Ω", "text-blue-400")}
                        ${createPracticalBadgeHTML(res, 'R_snub_practical')}
                    </span>
                </div>
                <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                    <span class="text-xs text-slate-400 inline-flex items-center">خازن بهینه اسنابر (C_snub):${outputTooltipHTML('C_snub_nF')}</span>
                    <span class="flex items-center gap-2">
                        ${createMathTooltipHTML(res, 'C_snub_nF', res.C_snub_nF.toFixed(2) + " nF", "text-blue-400")}
                        ${createPracticalBadgeHTML(res, 'C_snub_practical_nF')}
                    </span>
                </div>
                <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                    <span class="text-xs text-slate-400 inline-flex items-center">حداقل وات مقاومت تلفاتی (P_snub):${outputTooltipHTML('P_snub')}</span>
                    ${createMathTooltipHTML(res, 'P_snub', res.P_snub.toFixed(2) + " W", "text-orange-400")}
                </div>
                <div class="output-row flex justify-between items-center">
                    <span class="text-xs text-slate-400 inline-flex items-center">ولتاژ کلمپ ولتاژ گذرا (Clamp Level):${outputTooltipHTML('V_clamp')}</span>
                    ${createMathTooltipHTML(res, 'V_clamp', res.V_clamp.toFixed(0) + " V", "text-red-400")}
                </div>
            </div>
        `;
    }

    let chargerResultHTML = '';
    if (currentTab === 'charger' && res.charger_specs) {
        const specs = res.charger_specs;
        const vaux_ok = specs.Vaux_min_working >= specs.Vaux_uvlo;
        
        chargerResultHTML = `
            <div class="output-card border-r-blue-500 bg-slate-900/70 backdrop-blur-md border border-slate-800/70 rounded-2xl p-5 shadow-lg text-right">
                <h3 class="text-sm font-bold text-white mb-4 flex justify-between items-center">
                    <span>۵. تحلیل وضعیت شارژر در حالت بی‌باری (No-Load / CV Stop)</span>
                    <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">سیستم حفاظتی</span>
                </h3>
                <div class="output-row flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                    <span class="text-xs text-slate-400 inline-flex items-center">حداقل انرژی بسته نفوذی در بی‌باری (P_burst):${outputTooltipHTML('P_burst_min')}</span>
                    ${createMathTooltipHTML(res, 'P_burst_min', specs.P_burst_min.toFixed(3) + " W", "text-blue-400")}
                </div>
                <div class="output-row flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                    <span class="text-xs text-slate-400 inline-flex items-center">مقاومت بار کاذب توصیه شده (Dummy Load):${outputTooltipHTML('R_dummy')}</span>
                    <span class="flex items-center gap-2">
                        ${createMathTooltipHTML(res, 'R_dummy', specs.R_dummy.toFixed(0) + " Ω", "text-orange-400")}
                        ${createPracticalBadgeHTML(res, 'R_dummy_practical')}
                    </span>
                </div>
                ${res.has_aux ? `
                <div class="output-row flex justify-between items-center">
                    <span class="text-xs text-slate-400 inline-flex items-center">حداقل ولتاژ کمکی در ولتاژ تخلیه باتری (Vaux_min):${outputTooltipHTML('Vaux_min_working')}</span>
                    ${createMathTooltipHTML(res, 'Vaux_min_working', specs.Vaux_min_working.toFixed(1) + " V", !vaux_ok ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400')}
                </div>
                ` : ''}
            </div>
        `;
    }

    const wrapper = document.getElementById('results-wrapper');
    if (!wrapper) return;
    
    const b_limit = (typeof res.Bmax === 'number' && res.Bmax > 0) ? res.Bmax : 0.25;
    const b_badge = res.B_real <= b_limit
        ? `<span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">ایمن</span>`
        : `<span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 font-bold animate-bounce">خطر اشباع!</span>`;

    const ff_badge = res.FillFactor <= 0.40
        ? `<span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">جا می‌شود</span>`
        : `<span class="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30 font-bold">بسیار فشرده!</span>`;

    const mosfet_stress_badge = res.mosfet_safe
        ? `<span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">تایید فنی</span>`
        : `<span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 font-bold animate-pulse">احتمال تخریب سوئیچ!</span>`;

    wrapper.innerHTML = `
        <div class="output-card border-r-blue-500 bg-slate-900/70 backdrop-blur-md border border-slate-800/70 rounded-2xl p-5 shadow-lg text-right">
            <h3 class="text-sm font-bold text-white mb-4 flex justify-between items-center">
                <span>۱. محاسبات توان و اندوکتانس اولیه (Physical Basics)</span>
                <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">محاسبات پایه</span>
            </h3>
            
            ${(currentTab === 'acdc' || currentTab === 'charger') ? `
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-3 mt-2 bg-blue-900/20 p-2.5 rounded-lg border border-blue-500/40 shadow-inner shadow-blue-500/10">
                <span class="text-xs text-blue-300 font-bold flex items-center gap-2">
                    <span class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                    ظرفیت خازن صافی ورودی (C_bulk):
                    ${outputTooltipHTML('C_bulk')}
                </span>
                <span class="flex items-center gap-2">
                    ${createMathTooltipHTML(res, 'C_bulk', (res.C_bulk_val || 68.0).toFixed(1) + " µF", "text-blue-300 text-sm bg-blue-950/50 px-2 py-1 rounded-md border border-blue-500/30")}
                    ${createPracticalBadgeHTML(res, 'C_bulk_practical')}
                </span>
            </div>
            ` : ''}

            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">توان مصرفی ورودی ترانس (Pin):${outputTooltipHTML('Pin')}</span>
                ${createMathTooltipHTML(res, 'Pin', res.Pin.toFixed(1) + " W", "text-blue-400")}
            </div>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">اندوکتانس سیم‌پیچ اولیه (Lp):${outputTooltipHTML('Lp_uH')}</span>
                ${createMathTooltipHTML(res, 'Lp_uH', res.Lp_uH.toFixed(1) + " µH", "text-blue-400")}
            </div>
            <div class="output-row flex justify-between items-center">
                <span class="text-xs text-slate-400 inline-flex items-center">دیوتی سایکل واقعی کارکرد (Duty Cycle):${outputTooltipHTML('D_real')}</span>
                ${createMathTooltipHTML(res, 'D_real', (res.D_real * 100).toFixed(1) + " %", "text-slate-200")}
            </div>
        </div>

        ${snubberCardHTML}

        <div class="output-card border-r-emerald-500 bg-slate-900/70 backdrop-blur-md border border-slate-800/70 rounded-2xl p-5 shadow-lg text-right">
            <h3 class="text-sm font-bold text-white mb-4 flex justify-between items-center">
                <span>۳. جدول تعداد دورهای سیم‌پیچی (Transformer Windings)</span>
                <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">مشخصات پیچش</span>
            </h3>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">تعداد دور سیم‌پیچ اولیه (Np):${outputTooltipHTML('Np')}</span>
                ${createMathTooltipHTML(res, 'Np', res.Np + " دور", "text-emerald-400")}
            </div>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">تعداد دور سیم‌پیچ ثانویه اصلی (Ns):${outputTooltipHTML('Ns')}</span>
                ${createMathTooltipHTML(res, 'Ns', res.Ns + " دور", "text-emerald-400")}
            </div>
            ${res.has_aux ? `
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">تعداد دور سیم‌پیچ کمکی (Naux):${outputTooltipHTML('Naux')}</span>
                ${createMathTooltipHTML(res, 'Naux', res.Naux + " دور", "text-emerald-400")}
            </div>
            ` : ''}
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">ولتاژ بازتابی نهایی (Vro_real):${outputTooltipHTML('Vro_real')}</span>
                ${createMathTooltipHTML(res, 'Vro_real', res.Vro_real.toFixed(1) + " V", "text-slate-200")}
            </div>
            <div class="output-row flex justify-between items-center">
                <span class="text-xs text-slate-400 inline-flex items-center">ولتاژ مجاز ضربه سوئیچ اصلی (MOSFET Stress):${outputTooltipHTML('V_stress')}</span>
                ${createMathTooltipHTML(res, 'V_stress', res.V_stress.toFixed(0) + " V", "text-red-400")}
            </div>
        </div>

        <div class="output-card border-r-orange-500 bg-slate-900/70 backdrop-blur-md border border-slate-800/70 rounded-2xl p-5 shadow-lg text-right">
            <h3 class="text-sm font-bold text-white mb-4 flex justify-between items-center">
                <span>۴. ضخامت‌های مهندسی سیم‌ها و تحلیل سوئیچ (RMS & MOSFET Loss)</span>
                <span class="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">ضخامت مس و تلفات</span>
            </h3>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">جریان مؤثر اولیه (I_rms_pri):${outputTooltipHTML('I_rms_pri')}</span>
                ${createMathTooltipHTML(res, 'I_rms_pri', res.I_rms_pri.toFixed(2) + " A", "text-slate-200")}
            </div>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">حداقل قطر مس لخت اولیه (D_pri):${outputTooltipHTML('D_wire_pri')}</span>
                <span class="flex items-center gap-2">
                    ${createMathTooltipHTML(res, 'D_wire_pri', res.D_wire_pri.toFixed(2) + " mm", "text-orange-400")}
                    ${createPracticalBadgeHTML(res, 'D_wire_pri_practical')}
                </span>
            </div>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">حداقل قطر مس لخت ثانویه (D_sec):${outputTooltipHTML('D_wire_sec')}</span>
                <span class="flex items-center gap-2">
                    ${createMathTooltipHTML(res, 'D_wire_sec', res.D_wire_sec.toFixed(2) + " mm", "text-orange-400")}
                    ${createPracticalBadgeHTML(res, 'D_wire_sec_practical')}
                </span>
            </div>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">کل تلفات اتلافی سوئیچ قدرت (P_mosfet):${outputTooltipHTML('P_loss_mosfet')}</span>
                ${createMathTooltipHTML(res, 'P_loss_mosfet', res.P_loss_mosfet.toFixed(2) + " W", "text-red-400")}
            </div>
            <div class="output-row flex justify-between items-center">
                <span class="text-xs text-slate-400">وضعیت ایمنی کلی ولتاژ و جریان سوئیچ:</span>
                <span class="output-value flex items-center gap-2 font-bold font-mono">${mosfet_stress_badge}</span>
            </div>
        </div>

        ${chargerResultHTML}

        <div class="output-card border-r-red-500 bg-slate-900/70 backdrop-blur-md border border-slate-800/70 rounded-2xl p-5 shadow-lg text-right">
            <h3 class="text-sm font-bold text-white mb-4 flex justify-between items-center">
                <span>۶. امنیت هسته و بررسی فیزیکی (Physical Safety Validation)</span>
                <span class="text-xs bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded border border-red-500/30">مکانیک هسته</span>
            </h3>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">حداکثر چگالی شار کاری واقعی (B_real):${outputTooltipHTML('B_real')}</span>
                ${createMathTooltipHTML(res, 'B_real', res.B_real.toFixed(3) + " T", "text-slate-200")}
            </div>
            <div class="output-row flex justify-between items-center border-b border-slate-800/60 pb-2 mb-2">
                <span class="text-xs text-slate-400 inline-flex items-center">اندازه فاصله هوایی مرکز فریت (Air Gap - Lg):${outputTooltipHTML('AirGap')}</span>
                ${createMathTooltipHTML(res, 'AirGap', res.AirGap.toFixed(3) + " mm", "text-red-400")}
            </div>
            <div class="output-row flex justify-between items-center">
                <span class="text-xs text-slate-400 inline-flex items-center">ضریب پرشدن پنجره بوبین (Fill Factor):${outputTooltipHTML('FillFactor')}</span>
                ${createMathTooltipHTML(res, 'FillFactor', (res.FillFactor * 100).toFixed(1) + " %", "text-slate-200")}
            </div>
        </div>
    `;
}

// Binds live calculated values directly onto the schematic's spec panel
// (Transformer / MOSFET / Snubber cards) and onto the MOSFET symbol itself.
// The MOSFET card compares the calculated stress against the actual rated
// limits typed into the Vds_max / Ids_max inputs, and - if the selected
// part can't safely handle it - turns the card red, prints why, and draws
// a red X directly over the MOSFET symbol so the problem is impossible to
// miss, not just a line in the warnings list.
function updateSchematicValues(res) {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    const setFill = (id, color) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('fill', color);
    };

    const fmtOhm = (ohms) => {
        if (typeof ohms !== 'number' || isNaN(ohms)) return '--';
        return ohms >= 1000 ? (ohms / 1000).toFixed(2) + 'kΩ' : ohms.toFixed(0) + 'Ω';
    };

    // --- Card A: Transformer ---
    setText('lbl-lp', `Lp: ${res.Lp_uH.toFixed(1)} µH`);
    setText('lbl-turns', `Np:Ns ${res.Np}:${res.Ns}`);
    setText('lbl-airgap', `Air Gap: ${res.AirGap.toFixed(3)} mm`);

    const b_limit = (typeof res.Bmax === 'number' && res.Bmax > 0) ? res.Bmax : 0.25;
    const coreSafe = res.B_real <= b_limit;
    setText('lbl-bflux', `B: ${res.B_real.toFixed(2)} / ${b_limit.toFixed(2)} T`);
    setFill('lbl-bflux', coreSafe ? '#6ee7b7' : '#fda4af');

    // --- Card B: MOSFET ---
    const vdsMaxEl = document.getElementById('Vds_max');
    const idsMaxEl = document.getElementById('Ids_max');
    const Vds_max = vdsMaxEl ? parseFloat(vdsMaxEl.value) || 0 : 0;
    const Ids_max = idsMaxEl ? parseFloat(idsMaxEl.value) || 0 : 0;

    setText('lbl-vstress', `Vds: ${res.V_stress.toFixed(0)} / ${Vds_max.toFixed(0)} V`);
    setText('lbl-ipeak-mosfet', `Ipk: ${res.I_peak_pri.toFixed(2)} / ${Ids_max.toFixed(1)} A`);
    setText('lbl-ploss', `Ploss: ${res.P_loss_mosfet.toFixed(2)} W`);

    const mosfetCardRect = document.getElementById('mosfet-card-rect');
    const mosfetStatus = document.getElementById('lbl-mosfet-status');
    const failMark = document.getElementById('mosfet-fail-mark');
    const mosfetBox = document.getElementById('mosfet-box');
    const safeStroke = '#818cf8', dangerStroke = '#f43f5e';
    const safeVal = '#e2e8f0', dangerVal = '#fda4af';

    if (mosfetCardRect) mosfetCardRect.setAttribute('stroke', res.mosfet_safe ? safeStroke : dangerStroke);
    setFill('lbl-vstress', res.mosfet_safe ? safeVal : (res.V_stress >= 0.85 * Vds_max ? dangerVal : safeVal));
    setFill('lbl-ipeak-mosfet', res.mosfet_safe ? safeVal : (res.I_peak_pri >= 0.7 * Ids_max ? dangerVal : safeVal));

    if (mosfetStatus) {
        if (res.mosfet_safe) {
            mosfetStatus.textContent = 'وضعیت: ایمن ✓';
            mosfetStatus.setAttribute('fill', '#6ee7b7');
        } else {
            mosfetStatus.textContent = 'ماسفت کم می‌آورد! ✕';
            mosfetStatus.setAttribute('fill', '#fda4af');
        }
    }
    if (failMark) failMark.classList.toggle('hidden', res.mosfet_safe);
    if (mosfetBox) mosfetBox.setAttribute('stroke', res.mosfet_safe ? '#3b82f6' : dangerStroke);

    // --- Card C: Snubber / Input ---
    if (res.has_snubber) {
        setText('lbl-rsnub-val', `R_snub: ${fmtOhm(res.R_snub)}`);
        setText('lbl-csnub-val', `C_snub: ${res.C_snub_nF.toFixed(1)} nF`);
        setText('lbl-psnub-val', `P_snub: ${res.P_snub.toFixed(2)} W`);
    } else {
        setText('lbl-rsnub-val', 'R_snub: --');
        setText('lbl-csnub-val', 'C_snub: --');
        setText('lbl-psnub-val', 'P_snub: --');
    }

    if ((currentTab === 'acdc' || currentTab === 'charger') && typeof res.C_bulk_val === 'number') {
        setText('lbl-cbulk-val', `C_bulk: ${res.C_bulk_val.toFixed(0)} µF`);
    } else {
        setText('lbl-cbulk-val', 'C_bulk: N/A');
    }

    // Restart the CSS pulse animation on every refresh (removing then
    // re-adding a class does not restart a CSS animation on its own -
    // forcing a reflow in between makes the browser "notice" the change).
    document.querySelectorAll('.schematic-value-chip').forEach((chip) => {
        chip.classList.remove('schematic-value-chip');
        void chip.getBoundingClientRect();
        chip.classList.add('schematic-value-chip');
    });
}

function updateSchematicInteractive(dutyCycle, hasSnubber) {
    const priWinding = document.getElementById('pri-winding');
    const secWinding = document.getElementById('sec-winding');
    const diodeIcon = document.getElementById('diode-icon');
    const coreGlow = document.getElementById('core-glow');
    const airGapGlow = document.getElementById('air-gap-glow');
    const onInd = document.getElementById('state-on-indicator');
    const offInd = document.getElementById('state-off-indicator');
    const flowDotSnub = document.getElementById('flow-dot-snub');
    const snubDiode = document.getElementById('snub-diode');

    if (!priWinding || !secWinding) return;

    let toggle = true;
    clearInterval(window.schematicInterval);

    window.schematicInterval = setInterval(() => {
        if (toggle) {
            priWinding.setAttribute('stroke', '#3b82f6');
            secWinding.setAttribute('stroke', '#1e293b');
            if (diodeIcon) diodeIcon.setAttribute('fill', '#1e293b');
            if (coreGlow) coreGlow.setAttribute('stroke', '#e11d48');
            if (airGapGlow) airGapGlow.setAttribute('stroke', '#ef4444');
            
            if (snubDiode) snubDiode.setAttribute('fill', '#1e293b');
            if (flowDotSnub) flowDotSnub.classList.add('hidden');

            if (onInd) onInd.classList.add('font-bold', 'opacity-100');
            if (offInd) {
                offInd.classList.remove('font-bold', 'opacity-100');
                offInd.classList.add('opacity-40');
            }
            
            const flowDotPri = document.getElementById('flow-dot-pri');
            const flowDotSec = document.getElementById('flow-dot-sec');
            if (flowDotPri) flowDotPri.classList.remove('hidden');
            if (flowDotSec) flowDotSec.classList.add('hidden');
        } else {
            priWinding.setAttribute('stroke', '#1e293b');
            secWinding.setAttribute('stroke', '#10b981');
            if (diodeIcon) diodeIcon.setAttribute('fill', '#10b981');
            if (coreGlow) coreGlow.setAttribute('stroke', '#3b82f6');
            if (airGapGlow) airGapGlow.setAttribute('stroke', '#10b981');
            
            if (hasSnubber) {
                if (snubDiode) snubDiode.setAttribute('fill', '#38bdf8');
                if (flowDotSnub) flowDotSnub.classList.remove('hidden');
            } else {
                if (snubDiode) snubDiode.setAttribute('fill', '#1e293b');
                if (flowDotSnub) flowDotSnub.classList.add('hidden');
            }

            if (offInd) offInd.classList.add('font-bold', 'opacity-100');
            if (onInd) {
                onInd.classList.remove('font-bold', 'opacity-100');
                onInd.classList.add('opacity-40');
            }
            
            const flowDotPri = document.getElementById('flow-dot-pri');
            const flowDotSec = document.getElementById('flow-dot-sec');
            if (flowDotPri) flowDotPri.classList.add('hidden');
            if (flowDotSec) flowDotSec.classList.remove('hidden');
        }
        toggle = !toggle;
    }, 1200);
}

// Builds the trapezoidal primary/secondary current points (in data-space, not pixels)
// for a single switching cycle starting at t0, spanning cycleW.
function buildWaveformCyclePoints(t0, cycleW, isDCM, D_pri, D_sec, I_peak_pri, I_valley_pri, I_peak_sec, I_valley_sec) {
    const tOnEnd = t0 + (D_pri * cycleW);
    const tOffEnd = tOnEnd + (D_sec * cycleW);
    const tEnd = t0 + cycleW;

    const priStartI = isDCM ? 0 : I_valley_pri;
    const priPts = [
        [t0, priStartI],
        [tOnEnd, I_peak_pri],
        [tOnEnd, 0],
        [tEnd, 0]
    ];

    const secPts = [[t0, 0], [tOnEnd, 0], [tOnEnd, I_peak_sec]];
    if (tOffEnd >= tEnd - 1e-9) {
        // CCM: secondary current never fully decays before the next cycle starts
        secPts.push([tEnd, I_valley_sec]);
    } else {
        secPts.push([tOffEnd, 0]);
        secPts.push([tEnd, 0]);
    }

    return { priPts, secPts, tOnEnd, tOffEnd, tEnd };
}

// Fully redesigned live current-waveform chart, rendered as a scalable inline SVG instead
// of a fixed-height <canvas>. This avoids the old resize/measurement bug where the canvas
// could be measured before layout settled (leaving the grid squashed to a single tick),
// and adds a real labelled current axis, shaded Ton/Toff/Dead-time bands and soft gradient
// fills under both curves.
function drawWaveforms(isDCM, D_pri, D_sec, I_peak_pri, I_valley_pri, I_peak_sec, I_valley_sec) {
    const container = document.getElementById('waveform-plot');
    if (!container) return;

    const W = 600, H = 210;
    const plotLeft = 48, plotRight = 588;
    const topY = 16, baselineY = 150;
    const plotH = baselineY - topY;
    const plotW = plotRight - plotLeft;
    const cycles = 2;
    const cycleW = plotW / cycles;

    const maxI = Math.max(I_peak_pri, I_peak_sec, I_valley_pri, I_valley_sec, 0.01) * 1.2;
    const yFor = (i) => baselineY - (Math.max(0, i) / maxI) * plotH;
    const xFor = (t) => plotLeft + t;

    // Horizontal reference grid (5 evenly spaced levels, always fully drawn regardless of
    // container width since the whole chart is one viewBox-scaled SVG).
    let gridHTML = '';
    for (let g = 0; g <= 4; g++) {
        const gy = topY + (plotH / 4) * g;
        const val = maxI * (1 - g / 4);
        gridHTML += `<line x1="${plotLeft}" y1="${gy.toFixed(1)}" x2="${plotRight}" y2="${gy.toFixed(1)}" stroke="#1e293b" stroke-width="1" ${g < 4 ? 'stroke-dasharray="3 4"' : ''}/>`;
        gridHTML += `<text x="${plotLeft - 8}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#64748b" font-family="'Fira Code', monospace">${val.toFixed(1)}</text>`;
    }

    let bandsHTML = '';
    let labelsHTML = '';
    let priPointsAll = [];
    let secPointsAll = [];

    for (let c = 0; c < cycles; c++) {
        const t0 = c * cycleW;
        const { priPts, secPts, tOnEnd, tOffEnd, tEnd } = buildWaveformCyclePoints(
            t0, cycleW, isDCM, D_pri, D_sec, I_peak_pri, I_valley_pri, I_peak_sec, I_valley_sec
        );
        priPointsAll = priPointsAll.concat(priPts);
        secPointsAll = secPointsAll.concat(secPts);

        const xOn = xFor(tOnEnd), xOff = xFor(Math.min(tOffEnd, tEnd)), xEnd = xFor(tEnd), xStart = xFor(t0);
        bandsHTML += `<rect x="${xStart.toFixed(1)}" y="${topY}" width="${(xOn - xStart).toFixed(1)}" height="${plotH}" fill="#3b82f6" opacity="0.06"/>`;
        bandsHTML += `<rect x="${xOn.toFixed(1)}" y="${topY}" width="${(xOff - xOn).toFixed(1)}" height="${plotH}" fill="#10b981" opacity="0.06"/>`;
        if (tOffEnd < tEnd - 1e-9) {
            bandsHTML += `<rect x="${xOff.toFixed(1)}" y="${topY}" width="${(xEnd - xOff).toFixed(1)}" height="${plotH}" fill="#94a3b8" opacity="0.07"/>`;
        }
        if (c > 0) {
            bandsHTML += `<line x1="${xStart.toFixed(1)}" y1="${topY}" x2="${xStart.toFixed(1)}" y2="${baselineY}" stroke="#334155" stroke-width="1" stroke-dasharray="2 3"/>`;
        }
        if (c === 0) {
            labelsHTML += `<text x="${((xStart + xOn) / 2).toFixed(1)}" y="${baselineY + 16}" text-anchor="middle" font-size="8" fill="#93c5fd" font-family="'Fira Code', monospace">Ton ${(D_pri * 100).toFixed(0)}%</text>`;
            labelsHTML += `<text x="${((xOn + xOff) / 2).toFixed(1)}" y="${baselineY + 16}" text-anchor="middle" font-size="8" fill="#6ee7b7" font-family="'Fira Code', monospace">Toff ${(D_sec * 100).toFixed(0)}%</text>`;
            if (tOffEnd < tEnd - 1e-9) {
                const deadPct = Math.max(0, (1 - D_pri - D_sec) * 100);
                labelsHTML += `<text x="${((xOff + xEnd) / 2).toFixed(1)}" y="${baselineY + 16}" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="'Fira Code', monospace">Dead ${deadPct.toFixed(0)}%</text>`;
            }
        }
    }

    const toPath = (pts) => 'M ' + pts.map(([t, i]) => `${xFor(t).toFixed(1)},${yFor(i).toFixed(1)}`).join(' L ');
    const priPath = toPath(priPointsAll);
    const secPath = toPath(secPointsAll);
    const firstX = xFor(priPointsAll[0][0]).toFixed(1);
    const lastX = xFor(priPointsAll[priPointsAll.length - 1][0]).toFixed(1);
    const priArea = `${priPath} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;
    const secArea = `${secPath} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;

    const legendHTML = `
        <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mb-3 text-[10px] font-mono">
            <span class="flex items-center gap-1.5 text-blue-300">
                <span class="w-2 h-2 rounded-full bg-blue-500" style="box-shadow:0 0 6px rgba(59,130,246,0.8)"></span>
                I_pri: پیک ${I_peak_pri.toFixed(2)}A${!isDCM ? ' / دره ' + I_valley_pri.toFixed(2) + 'A' : ''}
            </span>
            <span class="flex items-center gap-1.5 text-emerald-300">
                <span class="w-2 h-2 rounded-full bg-emerald-500" style="box-shadow:0 0 6px rgba(16,185,129,0.8)"></span>
                I_sec: پیک ${I_peak_sec.toFixed(2)}A${!isDCM ? ' / دره ' + I_valley_sec.toFixed(2) + 'A' : ''}
            </span>
        </div>
    `;

    const svgHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg" direction="ltr" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="waveformPriGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="waveformSecGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
                </linearGradient>
            </defs>
            ${bandsHTML}
            ${gridHTML}
            <line x1="${plotLeft}" y1="${baselineY}" x2="${plotRight}" y2="${baselineY}" stroke="#475569" stroke-width="1.2"/>
            <path d="${priArea}" fill="url(#waveformPriGrad)" stroke="none"/>
            <path d="${secArea}" fill="url(#waveformSecGrad)" stroke="none"/>
            <path d="${priPath}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 3px rgba(59,130,246,0.55))"/>
            <path d="${secPath}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 3px rgba(16,185,129,0.55))"/>
            ${labelsHTML}
            <text x="${plotLeft}" y="${H - 4}" font-size="8" fill="#475569" font-family="'Fira Code', monospace">زمان (دو سیکل کامل سوئیچینگ) →</text>
            <text x="${plotRight}" y="12" text-anchor="end" font-size="8" fill="#475569" font-family="'Fira Code', monospace">جریان (A)</text>
        </svg>
    `;

    container.innerHTML = legendHTML + svgHTML;
}

// Initial Booting Sequence
window.onload = function() {
    switchTab('acdc');
}

// Automatically shut down the Flask server when the browser closes
window.addEventListener('beforeunload', function () {
    navigator.sendBeacon('/api/shutdown');
});