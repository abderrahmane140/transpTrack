import { create } from 'zustand'

const useTripStore = create((set, get) => ({
  activeTrips:     [],
  currentTrip:     null,
  vehiclePosition: null,
  eta:             null,
  locationHistory: [],

  setActiveTrips:      (trips)    => set({ activeTrips: trips }),
  setCurrentTrip:      (trip)     => set({ currentTrip: trip }),
  setVehiclePosition:  (position) => set({ vehiclePosition: position }),
  setEta:              (eta)      => set({ eta }),

  addLocationToHistory: (loc) =>
    set((s) => ({ locationHistory: [...s.locationHistory.slice(-300), loc] })),

  // Called by Echo WebSocket listener on every location update
  onLocationUpdated: (data) => {
    set({ vehiclePosition: data.location })
    get().addLocationToHistory(data.location)
  },

  reset: () => set({
    currentTrip:     null,
    vehiclePosition: null,
    eta:             null,
    locationHistory: [],
  }),
}))

export default useTripStore