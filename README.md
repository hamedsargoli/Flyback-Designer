# Flyback Transformer Design Suite

An engineering web tool for the physical and electrical design of offline flyback transformers, built on an independent Python physics/calculation engine with an interactive web front end.

---

## ⚙️ Supported Topologies

The application supports three independent design modes, each with its own input form, live equations, and dedicated physics:

| Tab | Application | Input Voltage |
|---|---|---|
| **High-Voltage AC-DC** | Offline mains-connected power supplies | AC (85–265V, through bridge rectifier + bulk cap) |
| **Industrial DC-DC** | Isolated converters from an existing DC bus (battery, solar, 24/48V industrial) | Direct DC, no rectifier bridge |
| **Smart Battery Charger** | Float/Cutoff chargers with a burst-mode dummy load | AC or DC, with charger-specific parameters |

Each tab is fully self-contained: its own input form, live formulas, and results panel.

---

## 🧮 Calculation Engine Core (`flyback_engine.py`)

### Automatic Conduction Mode Detection (CCM / DCM)
- Initial sizing based on the current ripple factor (`Kr`) or an explicit user-selected mode (Auto / CCM / DCM).
- After the realized (rounded) turns count is set, the actual CCM/DCM boundary is re-verified against the boundary power (`P_boundary`), correcting the operating mode if it shifts from the initial target.
- Separate peak/valley current calculation for primary and secondary in both conduction modes.

### Transformer Magnetic Design
- Primary inductance (`Lp`) calculated against the CCM or DCM design target.
- Primary/secondary/auxiliary turns count (`Np`, `Ns`, `Naux`) derived from the maximum allowed flux density (`Bmax`) and the target reflected voltage ratio.
- Core air gap calculated from the realized inductance and effective core cross-section.
- Realized flux density (`B_real`) recomputed after turns rounding, to confirm the core is not driven into saturation.
- Bobbin window fill factor computed from the copper cross-section of the primary, secondary, and auxiliary windings.
- Built-in library of standard ferrite core sizes (EE, EFD, RM, and other families) with real `Ae`/`Aw` values for quick selection.

### Electrical & Thermal Analysis
- Primary and secondary RMS current using the exact trapezoidal-waveform formula (peak, valley, and duty cycle).
- Required copper wire diameter derived from the target current density (`J`).
- MOSFET conduction and switching losses (`P_cond` + `P_sw`), with voltage/current safety validation against 70% and 85% margins.
- Skin depth calculated at the switching frequency, with an automatic warning to use Litz wire whenever the required wire diameter exceeds twice the skin depth.

### RCD Snubber (Leakage Clamp) Network
- Clamp voltage (`V_clamp`) derived from the maximum input voltage and the realized reflected-voltage ratio.
- Snubber power dissipation (`P_snub`) computed from the leakage inductance energy (modeled as 2.5% of `Lp`).
- Optimal snubber resistor and capacitor (`R_snub`, `C_snub`) sized to hit the target voltage ripple on the clamp capacitor.
- The computed clamp voltage is used directly as the MOSFET's real voltage-stress reference (instead of a fixed percentage guess) whenever the snubber is enabled.

### Smart Charger Mode
- Minimum burst-mode power (`P_burst_min`) from the minimum peak-current ratio and burst switching frequency.
- Dummy load resistor (`R_dummy`) sized for auxiliary supply stability at the Float voltage.
- Minimum working voltage of the auxiliary winding (`Vaux_min_working`) relative to the battery cutoff voltage.

### Input Bulk Capacitor Sizing
- Bulk capacitance sized from a valley-voltage ripple analysis at mains line frequency, for both the AC-DC and Charger tabs.
- Automatic warning if the calculated capacitance falls below the practical 1.5–3 µF/W range.

### Conversion to Practical (Off-the-Shelf) Values
Alongside every ideal mathematical result, the engine separately computes the nearest real-world catalog value — without altering any of the physics above:
- Snubber resistor → nearest E24 standard series value
- Snubber capacitor → nearest E12 standard series value, rounded up
- Bulk input capacitor → nearest electrolytic catalog step (with a 2x safety margin)
- Primary/secondary wire diameter → nearest standard enamelled copper wire size (IEC 60317)
- Charger dummy load resistor → nearest E24 value, rounded down

### Live Formula Generation
Every output parameter is returned together with its symbolic LaTeX formula, plain-text formula, the fully substituted equation with real numeric values, the final result, and its list of dependent variables — allowing the front end to display the complete step-by-step derivation of any number.

---

## 🖥️ Web Interface Features

### Interactive Live Schematic
- Full SVG schematic of the flyback circuit (primary/secondary windings, gapped core, MOSFET, snubber network).
- Live current-flow animation driven by the actual computed duty cycle, switching visually between the primary conduction phase and secondary recovery phase.
- Three synchronized spec cards overlaid on the schematic (Transformer, MOSFET, Snubber/Input) with live values and a pulse-glow effect on every new calculation.
- The snubber section of the schematic dynamically enables/disables based on the user's toggle.

### Live Waveform Chart
- Responsive SVG plot of the primary and secondary current waveforms (`I_pri`, `I_sec`) in both CCM and DCM.
- Live peak/valley current values displayed directly in the chart legend.

### Engineering Safety Warnings Panel
- All physical warnings (MOSFET voltage/current stress, skin effect, bulk capacitor adequacy) are aggregated into a single, immediately visible warnings panel.
- A safety status badge ("Safe" / at-risk) is placed directly on the MOSFET spec card in the schematic.

### KaTeX-Rendered Engineering Formulas
- Every equation is rendered as proper mathematical notation (KaTeX) rather than plain text.
- A dedicated tooltip on every output value shows the symbolic formula, the fully substituted formula, and the final numeric result — giving full traceability for how each parameter was derived.
- A "practical/standard value" badge is shown next to the ideal calculated value for any replaceable component (resistor, capacitor, wire).

### Dynamic, Grouped Input Form
- Inputs grouped by engineering category (electrical specs / magnetics / MOSFET).
- Quick-select library of standard ferrite cores that auto-fills the effective core area and bobbin window area.
- Toggle switches for the auxiliary winding and the snubber circuit that simultaneously update the input form, the live schematic, and the equations.
- Explicit conduction-mode target selection (Auto based on Kr / Forced CCM / Forced DCM).
- Bilingual (Persian/English) explanatory tooltip on every single input field for quick engineering reference.

---

## 🖼️ Application Screenshots

**High-Voltage AC-DC tab — live schematic, spec cards, and waveform chart:**
![AC-DC schematic view](pic/1.png)

**Base power/inductance calculations and the RCD snubber network:**
![Base and snubber calculations](pic/2.png)

**Winding turns table, RMS/wire-diameter analysis, and core physical validation:**
![Windings and physical validation](pic/3.png)

**Automatic skin-effect warning with a Litz wire recommendation:**
![Skin effect warning](pic/4.png)

---

## 🧱 Tech Stack

- **Backend:** Flask (Python) — a single `/api/calculate` endpoint that runs the physics engine and returns structured JSON results.
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework), with KaTeX formula rendering and hand-built SVG schematics/charts.
- **Engine:** A fully web-independent Python module (`flyback_engine.py`) that can also be imported and tested standalone.
