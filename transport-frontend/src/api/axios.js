import axios from  'axios'
import toast from 'react-hot-toast'

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers : {Accept: 'application/json', 'Content-Type': 'application/json' },
});


api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})


api.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error.response?.status
        const message = error.response?.data?.message

        if (status === 401) { //Unauthorized
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        } else if (status === 403) {  //Forbidden
            toast.error(message || 'Access denied.')
        } else if (status === 422) { //Validation Error
            const errors = error.response?.data?.errors
            if(errors) Object.values(errors).flat().forEach((m) => toast.error(m))
            else toast.error(message || 'Validation error.')
        } else if (status >= 500) {
            toast.error('Server error. Please try again.')
        }
        return Promise.reject(error)
    }
)

export default api