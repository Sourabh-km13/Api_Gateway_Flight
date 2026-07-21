const axios = require("axios")


function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

async function waitForService(url, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await axios.get(`${url}/health`, {
                timeout: 90000,
            })

            return true

        } catch (error) {
            const status = error.response?.status
            const code = error.code

            const retryable =
                ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT','ECONNABORTED'].includes(code) ||
                [502, 503, 504].includes(status)

            if (!retryable) {
                throw error
            }

            console.log( `Wake attempt ${attempt} failed. Code: ${code}, Status: ${status}`)

            if (attempt < maxAttempts) {
                await delay(attempt * 3000)
            }
        }
    }

    return false
}

module.exports = waitForService