-- Seed Data for Global Catalogues matching exact frontend specifications

-- 1. Spacecraft Component Catalogue
INSERT INTO public.spacecraft_component_catalog (id, name, category, mass, cost, power_generation, power_consumption, description, specifications)
VALUES
  ('bus-small', 'Small Spacecraft Bus (NanoSat/Cube)', 'structure', 120, 15000, 0, 25, 'Compact lightweight structural frame engineered for low-cost satellite insertions.', '{"Dry Mass": "120 kg", "Structural Integrity": "750 G", "Internal Volume": "0.8 m³"}'::jsonb),
  ('bus-medium', 'Medium Exploration Bus', 'structure', 380, 38000, 0, 50, 'Versatile standard spacecraft chassis with thermal radiation shielding and modular mounting bays.', '{"Dry Mass": "380 kg", "Structural Integrity": "1200 G", "Internal Volume": "2.4 m³"}'::jsonb),
  ('bus-heavy', 'Heavy Deep-Space Bus', 'structure', 850, 75000, 0, 90, 'Reinforced deep-space chassis designed for interplanetary transfer and high radiation zones.', '{"Dry Mass": "850 kg", "Structural Integrity": "2500 G", "Internal Volume": "5.6 m³"}'::jsonb),
  ('prop-chemical', 'Bipropellant Chemical Engine', 'propulsion', 140, 28000, 0, 30, 'High-thrust chemical thruster optimal for rapid delta-v transfer burns and orbit insertions.', '{"Specific Impulse (Isp)": "320 s", "Thrust Output": "450 N", "Propellant Type": "Hydrazine / NTO"}'::jsonb),
  ('prop-electric', 'Hall-Effect Electric Thruster', 'propulsion', 65, 45000, 0, 380, 'High efficiency electrostatic propulsion requiring steady electrical power.', '{"Specific Impulse (Isp)": "1800 s", "Thrust Output": "0.12 N", "Propellant Type": "Xenon Gas"}'::jsonb),
  ('prop-ion', 'Next-Gen Gridded Ion Thruster', 'propulsion', 85, 62000, 0, 520, 'Ultra-efficient deep space propulsion delivering extreme specific impulse for long voyages.', '{"Specific Impulse (Isp)": "4100 s", "Thrust Output": "0.09 N", "Propellant Type": "Xenon Gas"}'::jsonb),
  ('fuel-small', 'Small Pressurized Fuel Tank', 'fuel', 200, 12000, 0, 0, 'Lightweight composite propellant tank holding 200 kg of storable propellant.', '{"Fuel Capacity": "200 kg", "Tank Mass (Dry)": "25 kg", "Proof Pressure": "310 bar"}'::jsonb),
  ('fuel-medium', 'Standard Propellant Tank', 'fuel', 650, 26000, 0, 0, 'Mid-capacity propellant reservoir for cis-lunar transfer and orbital orbital maintenance.', '{"Fuel Capacity": "650 kg", "Tank Mass (Dry)": "60 kg", "Proof Pressure": "340 bar"}'::jsonb),
  ('fuel-large', 'Heavy Interplanetary Fuel Tank', 'fuel', 1600, 48000, 0, 0, 'High-volume titanium liner tank containing 1,600 kg of propellant for deep space insertions.', '{"Fuel Capacity": "1600 kg", "Tank Mass (Dry)": "140 kg", "Proof Pressure": "380 bar"}'::jsonb),
  ('power-low', 'Body-Mounted GaAs Solar Cells', 'power', 30, 14000, 180, 0, 'Surface mounted triple-junction solar panels requiring zero deployment mechanisms.', '{"Peak Power Output": "180 W", "Solar Cell Efficiency": "29.5%", "Degradation Rate": "1.8% / yr"}'::jsonb),
  ('power-medium', 'Deployable Articulated Solar Wings', 'power', 85, 32000, 550, 15, 'Dual-wing articulating tracking solar arrays with sun-sensor orientation gimbals.', '{"Peak Power Output": "550 W", "Span Length": "4.8 m", "Tracking Precision": "±0.5°"}'::jsonb),
  ('power-high', 'UltraFlex High-Efficiency Arrays', 'power', 140, 58000, 1200, 30, 'Circular accordion fold-out lightweight solar arrays engineered for outer solar system operation.', '{"Peak Power Output": "1200 W", "Array Diameter": "3.2 m each", "Specific Power": "150 W/kg"}'::jsonb),
  ('battery-small', 'Compact Li-Ion Battery Pack', 'energy', 25, 9000, 0, 0, 'Compact 400 Wh space-grade lithium-ion battery for orbital eclipse power.', '{"Storage Capacity": "400 Wh", "Cycle Life": "5,000 cycles", "Nominal Voltage": "28 V"}'::jsonb),
  ('battery-medium', 'Standard Battery Module', 'energy', 55, 18000, 0, 0, '1,200 Wh space-qualified power buffer supporting scientific payload operations during shadow passes.', '{"Storage Capacity": "1,200 Wh", "Thermal Range": "-10°C to +45°C", "Nominal Voltage": "28 V"}'::jsonb),
  ('battery-large', 'Heavy Deep-Space Battery Array', 'energy', 120, 36000, 0, 0, 'Robust 3,000 Wh redundant battery system engineered for extended eclipse periods.', '{"Storage Capacity": "3,000 Wh", "Redundancy": "Dual bus isolated", "Nominal Voltage": "28 V"}'::jsonb),
  ('comm-low', 'Omnidirectional Patch Antenna', 'communication', 8, 8000, 0, 10, 'Low-gain S-band antenna providing continuous command uplink in any spacecraft orientation.', '{"Frequency Band": "S-Band (2.2 GHz)", "Operational Range": "50,000 km", "Data Throughput": "64 kbps"}'::jsonb),
  ('comm-high', 'High-Gain Parabolic Dish (1.2m)', 'communication', 32, 24000, 0, 45, 'Steerable X-band parabolic reflector dish for high-speed scientific telemetry downlink.', '{"Frequency Band": "X-Band (8.4 GHz)", "Operational Range": "2,000,000 km", "Data Throughput": "2.5 Mbps"}'::jsonb),
  ('comm-deep', 'Deep-Space Ka-Band Optical Relay', 'communication', 75, 49000, 0, 130, 'State-of-the-art dual-band cryogenic antenna designed to communicate across hundreds of millions of kilometers.', '{"Frequency Band": "Ka-Band / Laser Optical", "Operational Range": "400,000,000 km", "Data Throughput": "50 Mbps at Mars"}'::jsonb),
  ('inst-camera', 'High-Resolution Multispectral Camera', 'instruments', 22, 26000, 0, 45, 'Sub-meter orbital imaging telescope capturing visual and near-infrared surface geological details.', '{"Optical Resolution": "0.3 m/px at 100km", "Spectral Channels": "8 bands (400-900nm)", "Science Yield": "+35% Lunar / +40% Mars"}'::jsonb),
  ('inst-spectrometer', 'Infrared Mineralogy Spectrometer', 'instruments', 35, 34000, 0, 60, 'Analyzes mineral composition, volatile compounds, surface ices, and hydrated clays.', '{"Wavelength Range": "0.8 - 5.0 μm", "Detectability": "Silicates, Carbonates, H2O", "Science Yield": "+45% Spectral Data"}'::jsonb),
  ('inst-magnetometer', 'Fluxgate Magnetometer Boom', 'instruments', 12, 16000, 0, 18, 'Deployable carbon-fiber boom measuring planetary magnetic field topology and solar wind interaction.', '{"Dynamic Range": "±65,000 nT", "Boom Length": "3.2 m deployable", "Sampling Frequency": "128 Hz"}'::jsonb),
  ('inst-radiation', 'Cosmic Radiation Dosimeter', 'instruments', 9, 14000, 0, 12, 'Silicon semiconductor detector cataloguing high-energy galactic cosmic rays and solar energetic particles.', '{"Energy Detection": "10 keV - 100 MeV", "Dosimetric Sensitivity": "0.1 μGy/hr", "Sensor Type": "Solid-state silicon telescope"}'::jsonb),
  ('inst-radar', 'Subsurface Sounding Radar', 'instruments', 48, 42000, 0, 95, 'Low-frequency radar penetrator capable of imaging sub-crustal liquid pockets and buried glaciers.', '{"Penetration Depth": "Up to 3.5 km", "Center Frequency": "20 MHz synthetic aperture", "Resolution": "15 m vertical"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  mass = EXCLUDED.mass,
  cost = EXCLUDED.cost,
  power_generation = EXCLUDED.power_generation,
  power_consumption = EXCLUDED.power_consumption,
  description = EXCLUDED.description,
  specifications = EXCLUDED.specifications;

-- 2. Launch Vehicle Catalogue
INSERT INTO public.launch_vehicle_catalog (id, name, payload_capacity, cost, reliability, max_delta_v, destinations, description)
VALUES
  ('orbit-x-light', 'ORBIT-X LIGHT (Falcon Mini / Vega Class)', 1500, 32000, 0.98, 2800, ARRAY['Earth Orbit', 'LEO', 'SSO'], 'Cost-effective, highly reliable two-stage light launch vehicle optimized for low Earth orbit satellites and compact cubesat constellations.'),
  ('orbit-x-heavy', 'ORBIT-X HEAVY (Vulcan / Falcon Heavy Class)', 3500, 58000, 0.95, 4200, ARRAY['Earth Orbit', 'Moon', 'Lunar Orbit', 'Lagrange L1/L2'], 'Workhorse medium-to-heavy booster equipped with cryogenic upper stage for trans-lunar injection and high-energy orbital deployment.'),
  ('orbit-x-deep-space', 'ORBIT-X DEEP SPACE (SLS / Super Heavy Class)', 8000, 110000, 0.93, 7500, ARRAY['Moon', 'Mars', 'Interplanetary', 'Deep Space'], 'Super-heavy exploration class rocket engineered for high-energy interplanetary trajectories and massive multi-instrument deep space probes.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  payload_capacity = EXCLUDED.payload_capacity,
  cost = EXCLUDED.cost,
  reliability = EXCLUDED.reliability,
  max_delta_v = EXCLUDED.max_delta_v,
  destinations = EXCLUDED.destinations,
  description = EXCLUDED.description;

-- 3. Mission Definitions Catalogue
INSERT INTO public.mission_catalog (id, codename, name, destination, difficulty, duration, budget, min_delta_v, max_payload_mass, required_instruments, description, briefing, objectives, requirements)
VALUES
  ('lunar-explorer', 'ARTEMIS-PATH-I', 'Lunar Explorer', 'Moon', 'Easy', '14 days', 150000, 3800, 1500, ARRAY['inst-camera'], 
   'Design and deploy a lunar orbital spacecraft to conduct reconnaissance of candidate landing sites in the lunar south polar region.',
   'Launch from Cape Canaveral into low Earth parking orbit, execute Trans-Lunar Injection (TLI), and perform lunar orbit insertion. You must verify communication relay capability and deploy high-resolution optical cameras.',
   '[{"id":"obj-1","description":"Achieve stable Lunar Polar Orbit (100km ± 15km)","required":true},{"id":"obj-2","description":"Acquire high-resolution optical imagery of South Pole Shackleton Crater","required":true},{"id":"obj-3","description":"Transmit at least 250MB of scientific telemetry to Deep Space Network","required":true},{"id":"obj-4","description":"Maintain >15% remaining delta-v reserve after orbital capture","required":false}]'::jsonb,
   '[{"type":"mass","value":1500,"unit":"kg","description":"Total Spacecraft Wet Mass <= 1,500 kg"},{"type":"power","value":350,"unit":"W","description":"Continuous Power Generation >= 350 W"},{"type":"fuel","value":3800,"unit":"m/s","description":"Mission Delta-V Capability >= 3,800 m/s"},{"type":"communication","value":2.0,"unit":"Mbps","description":"X-Band Link Throughput >= 2.0 Mbps"}]'::jsonb),
  
  ('earth-observer', 'TERRA-SCAN-II', 'Earth Observer', 'Earth Orbit', 'Medium', '30 days', 180000, 4200, 2200, ARRAY['inst-camera', 'inst-spectrometer'],
   'Insert an advanced environmental monitoring satellite into Sun-Synchronous Orbit (SSO) to track terrestrial biome and climate indicators.',
   'Place an Earth observation platform into a 650 km Sun-Synchronous Orbit. The platform must maintain positive power balance during 35-minute orbital eclipses and deliver continuous multispectral scans.',
   '[{"id":"obj-1","description":"Attain 650km Sun-Synchronous Orbit (inclination 98.2°)","required":true},{"id":"obj-2","description":"Deploy multispectral camera and infrared spectrometer sensors","required":true},{"id":"obj-3","description":"Survive simulated 35-minute eclipse without battery depth-of-discharge exceeding 60%","required":true},{"id":"obj-4","description":"Downlink 1.2 GB of calibrated atmospheric spectrometry datasets","required":false}]'::jsonb,
   '[{"type":"mass","value":2200,"unit":"kg","description":"Total Spacecraft Wet Mass <= 2,200 kg"},{"type":"power","value":600,"unit":"W","description":"Power Generation >= 600 W"},{"type":"fuel","value":4200,"unit":"m/s","description":"Total Delta-V >= 4,200 m/s"},{"type":"communication","value":10,"unit":"Mbps","description":"High-Throughput Downlink Rate >= 10 Mbps"}]'::jsonb),

  ('mars-pathfinder', 'ARES-VANGUARD-III', 'Mars Pathfinder', 'Mars', 'Hard', '180 days', 280000, 6800, 3200, ARRAY['inst-camera', 'inst-spectrometer', 'inst-magnetometer'],
   'Pioneer interplanetary voyage from Earth to Mars orbit. Conduct atmospheric entry reconnaissance and global mineral mapping.',
   'The ultimate test of spacecraft systems engineering. Traverse 225 million kilometers across heliocentric space, survive extreme space weather events, and execute Mars Orbital Insertion (MOI) with high-efficiency propulsion.',
   '[{"id":"obj-1","description":"Execute Trans-Mars Injection (TMI) burn with <0.2% velocity error","required":true},{"id":"obj-2","description":"Perform Mars Orbit Insertion (MOI) into elliptical capture orbit","required":true},{"id":"obj-3","description":"Maintain deep space communication link over 1.5 AU distance","required":true},{"id":"obj-4","description":"Collect and return 3.5 GB of Martian magnetosphere and mineralogy telemetry","required":true},{"id":"obj-5","description":"Successfully resolve in-flight solar energetic particle anomaly","required":false}]'::jsonb,
   '[{"type":"mass","value":3200,"unit":"kg","description":"Total Spacecraft Wet Mass <= 3,200 kg"},{"type":"power","value":900,"unit":"W","description":"Power Generation >= 900 W at 1.5 AU"},{"type":"fuel","value":6800,"unit":"m/s","description":"Total Interplanetary Delta-V >= 6,800 m/s"},{"type":"communication","value":50,"unit":"Mbps","description":"Deep Space Optical/Ka-Band Communication Link"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  codename = EXCLUDED.codename,
  name = EXCLUDED.name,
  destination = EXCLUDED.destination,
  difficulty = EXCLUDED.difficulty,
  duration = EXCLUDED.duration,
  budget = EXCLUDED.budget,
  min_delta_v = EXCLUDED.min_delta_v,
  max_payload_mass = EXCLUDED.max_payload_mass,
  required_instruments = EXCLUDED.required_instruments,
  description = EXCLUDED.description,
  briefing = EXCLUDED.briefing,
  objectives = EXCLUDED.objectives,
  requirements = EXCLUDED.requirements;

