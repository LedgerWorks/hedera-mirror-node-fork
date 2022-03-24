import http from "k6/http";

export const headers = {
    'Content-Type': 'application/json',
    'Authorization': __ENV['API_KEY']
};

export function authorizedGet(url) {
    return http.get(url, { headers });
}