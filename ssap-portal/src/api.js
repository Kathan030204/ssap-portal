import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api', // No trailing slash here
});

export default api;