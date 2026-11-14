import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COMPONENT_CATALOGUE } from '@/data/components'
import { LAUNCH_VEHICLES } from '@/data/launchVehicles'

export type ComponentCategory = 
  | 'structure' 
  | 'propulsion' 
  | 'fuel' 
  | 'power' 
  | 'energy' 
  | 'communication' 
  | 'instruments'

export interface SpacecraftComponent {
  id: string
  name: string
  category: ComponentCategory
  mass: number // kg
  cost: number // credits
  powerGeneration: number // W (positive for generators)
  powerConsumption: number // W (positive for consumers)
  description: string
  specifications: Record<string, string | number>
}

export interface LaunchVehicle {
  id: string
  name: string
  payloadCapacity: number // kg
  cost: number // credits
  reliability: number // 0-1
  maxDeltaV: number // m/s additional
  destinations: string[]
  description: string
}

interface SpacecraftState {
  missionId: string | null
  selectedComponents: SpacecraftComponent[]
  selectedLaunchVehicle: LaunchVehicle | null
  
  // Actions
  setMissionId: (missionId: string) => void
  addComponent: (component: SpacecraftComponent) => void
  removeComponent: (componentId: string) => void
  replaceComponent: (oldId: string, newComponent: SpacecraftComponent) => void
  setLaunchVehicle: (vehicle: LaunchVehicle | null) => void
  clearDesign: () => void
  ensureMandatoryInstruments: (requiredInstruments?: string[]) => void
  autoEquipFlightReady: (missionRequirements?: { requiredInstruments?: string[]; minDeltaV?: number; destination?: string }) => void
  
  // Derived (computed via selectors)
  getTotalMass: () => number
  getTotalCost: () => number
  getPowerGeneration: () => number
  getPowerConsumption: () => number
  getPowerBalance: () => number
}

export const useSpacecraftStore = create<SpacecraftState>()(
  persist(
    (set, get) => ({
      missionId: null,
      selectedComponents: [],
      selectedLaunchVehicle: null,

      setMissionId: (missionId) => set({ missionId }),

      addComponent: (component) => {
        set((state) => ({
          selectedComponents: [...state.selectedComponents, component],
        }))
      },

      removeComponent: (componentId) => {
        set((state) => ({
          selectedComponents: state.selectedComponents.filter((c) => c.id !== componentId),
        }))
      },

      replaceComponent: (oldId, newComponent) => {
        set((state) => ({
          selectedComponents: state.selectedComponents.map((c) =>
            c.id === oldId ? newComponent : c
          ),
        }))
      },

      setLaunchVehicle: (vehicle) => set({ selectedLaunchVehicle: vehicle }),

      clearDesign: () => set({
        selectedComponents: [],
        selectedLaunchVehicle: null,
      }),

      ensureMandatoryInstruments: (requiredInstruments) => {
        if (!requiredInstruments || requiredInstruments.length === 0) return
        const state = get()
        let updated = false
        const currentComponents = [...state.selectedComponents]

        for (const req of requiredInstruments) {
          const reqNormalized = req.toLowerCase().replace('inst-', '')
          const alreadyInstalled = currentComponents.some(
            (c) => c.id.toLowerCase() === req.toLowerCase() ||
                   c.id.toLowerCase() === `inst-${reqNormalized}` ||
                   c.name.toLowerCase().includes(reqNormalized)
          )

          if (!alreadyInstalled) {
            const matchingComp = COMPONENT_CATALOGUE.find(
              (c) => c.id.toLowerCase() === req.toLowerCase() ||
                     c.id.toLowerCase() === `inst-${reqNormalized}` ||
                     c.name.toLowerCase().includes(reqNormalized)
            )
            if (matchingComp && !currentComponents.some((c) => c.id === matchingComp.id)) {
              currentComponents.push(matchingComp)
              updated = true
            }
          }
        }

        if (updated) {
          set({ selectedComponents: currentComponents })
        }
      },

      autoEquipFlightReady: (missionRequirements) => {
        const state = get()
        let currentComponents = [...state.selectedComponents]

        // 1. Ensure Structural Bus exists (preserve user's selected bus if already present)
        const hasBus = currentComponents.some((c) => c.category === 'structure')
        if (!hasBus) {
          const defaultBus = COMPONENT_CATALOGUE.find((c) => c.id === 'bus-medium') || COMPONENT_CATALOGUE[0]
          currentComponents.push(defaultBus)
        }

        // 2. Ensure Propulsion Engine exists
        const hasProp = currentComponents.some((c) => c.category === 'propulsion')
        if (!hasProp) {
          const defaultProp = COMPONENT_CATALOGUE.find((c) => c.id === 'prop-chemical')
          if (defaultProp) currentComponents.push(defaultProp)
        }

        // 3. Ensure Fuel Tank exists
        const hasFuel = currentComponents.some((c) => c.category === 'fuel')
        if (!hasFuel) {
          const defaultFuel = COMPONENT_CATALOGUE.find((c) => c.id === 'fuel-medium')
          if (defaultFuel) currentComponents.push(defaultFuel)
        }

        // 4. Ensure Solar Panels exist & deliver positive power
        const hasPower = currentComponents.some((c) => c.category === 'power')
        if (!hasPower) {
          const defaultPower = COMPONENT_CATALOGUE.find((c) => c.id === 'power-medium')
          if (defaultPower) currentComponents.push(defaultPower)
        }

        // 5. Ensure Energy Storage (Battery) exists
        const hasEnergy = currentComponents.some((c) => c.category === 'energy')
        if (!hasEnergy) {
          const defaultEnergy = COMPONENT_CATALOGUE.find((c) => c.id === 'energy-standard')
          if (defaultEnergy) currentComponents.push(defaultEnergy)
        }

        // 6. Ensure Communication Antenna exists (High-gain or deep space based on destination)
        const hasComm = currentComponents.some((c) => c.category === 'communication')
        if (!hasComm) {
          const isMars = missionRequirements?.destination?.toLowerCase().includes('mars')
          const commId = isMars ? 'comm-deep' : 'comm-high'
          const defaultComm = COMPONENT_CATALOGUE.find((c) => c.id === commId) || COMPONENT_CATALOGUE.find((c) => c.category === 'communication')
          if (defaultComm) currentComponents.push(defaultComm)
        }

        // 7. Ensure Mandatory Scientific Instruments are installed
        const requiredInsts = missionRequirements?.requiredInstruments || []
        for (const req of requiredInsts) {
          const reqNormalized = req.toLowerCase().replace('inst-', '')
          const hasInst = currentComponents.some(
            (c) => c.id.toLowerCase() === req.toLowerCase() ||
                   c.id.toLowerCase() === `inst-${reqNormalized}` ||
                   c.name.toLowerCase().includes(reqNormalized)
          )
          if (!hasInst) {
            const matchingComp = COMPONENT_CATALOGUE.find(
              (c) => c.id.toLowerCase() === req.toLowerCase() ||
                     c.id.toLowerCase() === `inst-${reqNormalized}` ||
                     c.name.toLowerCase().includes(reqNormalized)
            )
            if (matchingComp && !currentComponents.some((c) => c.id === matchingComp.id)) {
              currentComponents.push(matchingComp)
            }
          }
        }

        // 8. Ensure Launch Vehicle is assigned if null
        let vehicle = state.selectedLaunchVehicle
        if (!vehicle) {
          const isMars = missionRequirements?.destination?.toLowerCase().includes('mars')
          const isMoon = missionRequirements?.destination?.toLowerCase().includes('moon') || missionRequirements?.destination?.toLowerCase().includes('lunar')
          const vehicleId = isMars ? 'orbit-x-deep-space' : isMoon ? 'orbit-x-heavy' : 'orbit-x-light'
          vehicle = LAUNCH_VEHICLES.find((v) => v.id === vehicleId) || LAUNCH_VEHICLES[0]
        }

        set({
          selectedComponents: currentComponents,
          selectedLaunchVehicle: vehicle,
        })
      },

      getTotalMass: () => {
        return get().selectedComponents.reduce((sum, c) => sum + c.mass, 0)
      },

      getTotalCost: () => {
        const componentCost = get().selectedComponents.reduce((sum, c) => sum + c.cost, 0)
        const vehicleCost = get().selectedLaunchVehicle?.cost ?? 0
        return componentCost + vehicleCost
      },

      getPowerGeneration: () => {
        return get().selectedComponents.reduce((sum, c) => sum + c.powerGeneration, 0)
      },

      getPowerConsumption: () => {
        return get().selectedComponents.reduce((sum, c) => sum + c.powerConsumption, 0)
      },

      getPowerBalance: () => {
        const gen = get().getPowerGeneration()
        const con = get().getPowerConsumption()
        return gen - con
      },
    }),
    {
      name: 'orbit-x-spacecraft',
    }
  )
)
