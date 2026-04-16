import api from "./axios";

export const vehiclesApi   = {
    list:    (params)     =>  api.get('/vehicles', {params}),
    get:     (id)         =>  api.get(`/vehicles/${id}`),
    create: (data)        =>  api.post('/vehicles', data),
    update: (id,data)     =>  api.put(`/vehicles/${id}`, data),
    delete: (id)          =>  api.delete(`/vehicles/${id}`)
}



// ── Drivers ─────────────────────────────────────────────────────────────────
export const driversApi  ={
  list:            (params)   => api.get('/drivers', { params }),
  get:             (id)       => api.get(`/drivers/${id}`),
  create:          (data)     => api.post('/drivers', data),
  update:          (id, data) => api.put(`/drivers/${id}`, data),
  delete:          (id)       => api.delete(`/drivers/${id}`),
  assignVehicle:   (id, data) => api.post(`/drivers/${id}/assign-vehicle`, data),
  unassignVehicle: (id)       => api.delete(`/drivers/${id}/unassign-vehicle`),
  myVehicle:       ()         => api.get('/my/vehicle'),
  myActiveTrip:    ()         => api.get('/my/trip'),
}

// ── Employees ────────────────────────────────────────────────────────────────
export const employeesApi = {
      list:         (params)   => api.get('/employees', { params }),
  get:          (id)       => api.get(`/employees/${id}`),
  create:       (data)     => api.post('/employees', data),
  update:       (id, data) => api.put(`/employees/${id}`, data),
  delete:       (id)       => api.delete(`/employees/${id}`),
  assignRoute:  (id, data) => api.post(`/employees/${id}/assign-route`, data),
  myRoute:      ()         => api.get('/my/route'),
  myActiveTrip: ()         => api.get('/my/trip'),
}

// ── Routes ───────────────────────────────────────────────────────────────────
export const routeApi = {
  list:       (params)              => api.get('/routes', { params }),
  get:        (id)                  => api.get(`/routes/${id}`),
  create:     (data)                => api.post('/routes', data),
  update:     (id, data)            => api.put(`/routes/${id}`, data),
  delete:     (id)                  => api.delete(`/routes/${id}`),
  stops:      (id)                  => api.get(`/routes/${id}/stops`),
  createStop: (routeId, data)       => api.post(`/routes/${routeId}/stops`, data),
  updateStop: (routeId, stopId, data) => api.put(`/stops/${stopId}`, data),
  deleteStop: (routeId, stopId)     => api.delete(`/stops/${stopId}`),
}


// ── Trips ────────────────────────────────────────────────────────────────────
export const tripApi = {
  list:      (params) => api.get('/trips', { params }),
  active:    ()       => api.get('/trips/active'),
  get:       (id)     => api.get(`/trips/${id}`),
  create:    (data)   => api.post('/trips', data),
  start:     (id)     => api.post(`/trips/${id}/start`),
  stop:      (id)     => api.post(`/trips/${id}/stop`),
  delete:    (id)     => api.delete(`/trips/${id}`),
  employees: (id)     => api.get(`/trips/${id}/employees`),
}


// ── Locations ────────────────────────────────────────────────────────────────
export const locationsApi = {
  postLocation: (tripId, data)    => api.post(`/trips/${tripId}/location`, data),
  latest:       (tripId)          => api.get(`/trips/${tripId}/location/latest`),
  history:      (tripId, params)  => api.get(`/trips/${tripId}/location/history`, { params }),
  eta:          (tripId)          => api.get(`/trips/${tripId}/eta`),
}

// ── Simulation ───────────────────────────────────────────────────────────────
export const simulationApi = {
  start:  (tripId) => api.post(`/simulation/start/${tripId}`),
  stop:   (tripId) => api.post(`/simulation/stop/${tripId}`),
  status: (tripId) => api.get(`/simulation/status/${tripId}`),
}