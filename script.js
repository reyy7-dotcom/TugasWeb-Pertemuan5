// Masukkan API key OpenWeatherMap di sini
const API_KEY = "MASUKKAN_API_KEY_DISINI";

const CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const HISTORY_KEY = "weatherSearchHistory";
const DEFAULT_CITY = "Medan";

const appState = {
    unit: "C",
    currentWeather: null,
    forecast: [],
    history: []
};

const elements = {
    searchForm: document.querySelector("#search-form"),
    cityInput: document.querySelector("#city-input"),
    searchButton: document.querySelector("#search-button"),
    statusMessage: document.querySelector("#status-message"),
    statusTitle: document.querySelector("#status-title"),
    statusDetail: document.querySelector("#status-detail"),
    loadingPanel: document.querySelector("#loading-panel"),
    weatherPanel: document.querySelector("#weather-panel"),
    weatherDate: document.querySelector("#weather-date"),
    locationName: document.querySelector("#location-name"),
    currentTemperature: document.querySelector("#current-temperature"),
    weatherDescription: document.querySelector("#weather-description"),
    feelsLike: document.querySelector("#feels-like"),
    humidity: document.querySelector("#humidity"),
    windSpeed: document.querySelector("#wind-speed"),
    weatherIcon: document.querySelector("#weather-icon"),
    weatherVisualLabel: document.querySelector("#weather-visual-label"),
    forecastSection: document.querySelector("#forecast-section"),
    forecastList: document.querySelector("#forecast-list"),
    historyList: document.querySelector("#history-list"),
    historyEmpty: document.querySelector("#history-empty"),
    clearHistoryButton: document.querySelector("#clear-history-button"),
    unitButtons: document.querySelectorAll(".unit-button")
};

const isApiKeyConfigured = () => API_KEY && API_KEY !== "MASUKKAN_API_KEY_DISINI";

const capitalizeText = (text) => {
    if (!text) return "";
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

const convertTemperature = (temperatureInCelsius) => {
    if (appState.unit === "F") {
        return Math.round((temperatureInCelsius * 9) / 5 + 32);
    }

    return Math.round(temperatureInCelsius);
};

const formatTemperature = (temperatureInCelsius) => (
    `${convertTemperature(temperatureInCelsius)}°${appState.unit}`
);

const getWeatherIconUrl = (iconCode, size = "2x") => (
    `https://openweathermap.org/img/wn/${iconCode}@${size}.png`
);

const formatCurrentDate = (timestamp, timezoneOffset) => {
    const localTimestamp = (timestamp + timezoneOffset) * 1000;

    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC"
    }).format(new Date(localTimestamp));
};

const formatForecastDay = (dateText) => {
    const date = new Date(`${dateText.replace(" ", "T")}Z`);

    return new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        timeZone: "UTC"
    }).format(date);
};

const showStatus = (title, detail = "", type = "info") => {
    elements.statusTitle.textContent = title;
    elements.statusDetail.textContent = detail;
    elements.statusMessage.dataset.type = type;
    elements.statusMessage.hidden = false;
};

const hideStatus = () => {
    elements.statusMessage.hidden = true;
    elements.statusTitle.textContent = "";
    elements.statusDetail.textContent = "";
};

const showError = (message, detail) => {
    showStatus(message, detail, "error");
};

const showLoading = (isLoading) => {
    elements.searchButton.disabled = isLoading;
    elements.searchButton.textContent = isLoading ? "Mencari..." : "Cari";
    elements.cityInput.setAttribute("aria-busy", String(isLoading));
    elements.loadingPanel.hidden = !isLoading;

    if (isLoading) {
        hideStatus();
        elements.weatherPanel.hidden = true;
        elements.forecastSection.hidden = true;
    }
};

const getStoredHistory = () => {
    try {
        const storedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? [];
        return Array.isArray(storedHistory)
            ? storedHistory.filter((city) => typeof city === "string").slice(0, 5)
            : [];
    } catch (error) {
        console.warn("Riwayat pencarian tidak dapat dibaca.", error);
        return [];
    }
};

const saveHistory = (city) => {
    const filteredHistory = appState.history.filter(
        (item) => item.toLowerCase() !== city.toLowerCase()
    );

    appState.history = [city, ...filteredHistory].slice(0, 5);

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(appState.history));
    } catch (error) {
        console.warn("Riwayat pencarian tidak dapat disimpan.", error);
    }

    renderHistory();
};

const renderHistory = () => {
    elements.historyList.replaceChildren();

    const historyButtons = appState.history.map((city) => {
        const button = document.createElement("button");
        button.className = "history-button";
        button.type = "button";
        button.textContent = city;
        button.dataset.city = city;
        button.setAttribute("aria-label", `Cari cuaca ${city}`);
        return button;
    });

    elements.historyList.append(...historyButtons);
    const hasHistory = appState.history.length > 0;
    elements.historyEmpty.hidden = hasHistory;
    elements.clearHistoryButton.hidden = !hasHistory;
};

const renderWeather = () => {
    if (!appState.currentWeather) return;

    const {
        name,
        sys,
        main,
        weather,
        wind,
        dt,
        timezone
    } = appState.currentWeather;
    const [condition] = weather;
    const description = capitalizeText(condition.description);

    elements.weatherDate.textContent = formatCurrentDate(dt, timezone);
    elements.locationName.textContent = `${name}, ${sys.country}`;
    elements.currentTemperature.textContent = formatTemperature(main.temp);
    elements.weatherDescription.textContent = description;
    elements.feelsLike.textContent = formatTemperature(main.feels_like);
    elements.humidity.textContent = `${main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(wind.speed * 3.6)} km/jam`;
    elements.weatherIcon.src = getWeatherIconUrl(condition.icon, "4x");
    elements.weatherIcon.alt = `Ikon cuaca ${condition.description}`;
    elements.weatherVisualLabel.textContent = description;
    elements.weatherPanel.hidden = false;
};

const renderForecast = () => {
    elements.forecastList.replaceChildren();

    const forecastCards = appState.forecast.map((item) => {
        const [condition] = item.weather;
        const card = document.createElement("article");
        const day = document.createElement("p");
        const icon = document.createElement("img");
        const temperature = document.createElement("p");
        const description = document.createElement("p");

        card.className = "forecast-item";
        day.className = "forecast-day";
        icon.className = "forecast-icon";
        temperature.className = "forecast-temperature";
        description.className = "forecast-description";

        day.textContent = formatForecastDay(item.dt_txt);
        icon.src = getWeatherIconUrl(condition.icon);
        icon.alt = `Ikon ${condition.description}`;
        icon.width = 100;
        icon.height = 100;
        icon.loading = "lazy";
        temperature.textContent = formatTemperature(item.main.temp);
        description.textContent = capitalizeText(condition.description);

        card.append(day, icon, temperature, description);
        return card;
    });

    elements.forecastList.append(...forecastCards);
    elements.forecastSection.hidden = appState.forecast.length === 0;
};

const getResponseError = (status) => {
    if (status === 404) {
        return {
            type: "not-found",
            message: "Kota tidak ditemukan.",
            detail: "Periksa kembali nama kota lalu coba lagi."
        };
    }

    if (status === 401) {
        return {
            type: "api-key",
            message: "API key tidak valid.",
            detail: "Periksa API key OpenWeatherMap di file script.js."
        };
    }

    return {
        type: "api",
        message: "Terjadi kesalahan saat mengambil data cuaca.",
        detail: "Silakan coba kembali beberapa saat lagi."
    };
};

const fetchJson = async (url) => {
    let response;

    try {
        response = await fetch(url);
    } catch (error) {
        throw {
            type: "network",
            message: "Tidak dapat terhubung ke layanan cuaca.",
            detail: "Periksa koneksi internet Anda dan coba kembali.",
            cause: error
        };
    }

    if (!response.ok) {
        throw getResponseError(response.status);
    }

    return response.json();
};

const getWeather = async (city) => {
    const encodedCity = encodeURIComponent(city);
    const query = `q=${encodedCity}&appid=${API_KEY}&units=metric&lang=id`;
    const currentWeatherUrl = `${CURRENT_WEATHER_URL}?${query}`;
    const forecastUrl = `${FORECAST_URL}?${query}`;

    const [currentWeather, forecastData] = await Promise.all([
        fetchJson(currentWeatherUrl),
        fetchJson(forecastUrl)
    ]);

    const dailyForecast = forecastData.list
        .filter((item) => item.dt_txt.includes("12:00:00"))
        .slice(0, 5);

    return { currentWeather, dailyForecast };
};

const searchWeather = async (city) => {
    const normalizedCity = city.trim();

    if (!normalizedCity) {
        showError(
            "Masukkan nama kota terlebih dahulu.",
            "Ketik nama kota pada kolom pencarian."
        );
        elements.cityInput.focus();
        return;
    }

    if (!isApiKeyConfigured()) {
        showError(
            "API key belum diisi.",
            "Masukkan API key OpenWeatherMap pada konstanta API_KEY di file script.js."
        );
        return;
    }

    showLoading(true);

    try {
        const { currentWeather, dailyForecast } = await getWeather(normalizedCity);
        appState.currentWeather = currentWeather;
        appState.forecast = dailyForecast;

        renderWeather();
        renderForecast();
        saveHistory(currentWeather.name);
        elements.cityInput.value = "";
        hideStatus();
    } catch (error) {
        console.error("Gagal mengambil data cuaca.", error);
        showError(
            error.message ?? "Terjadi kesalahan saat mengambil data cuaca.",
            error.detail ?? "Silakan coba kembali beberapa saat lagi."
        );

        if (appState.currentWeather) {
            renderWeather();
            renderForecast();
        }
    } finally {
        showLoading(false);
    }
};

const setUnit = (unit) => {
    if (!['C', 'F'].includes(unit) || appState.unit === unit) return;

    appState.unit = unit;
    elements.unitButtons.forEach((button) => {
        const isActive = button.dataset.unit === unit;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    renderWeather();
    renderForecast();
};

elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchWeather(elements.cityInput.value);
});

elements.unitButtons.forEach((button) => {
    button.addEventListener("click", () => setUnit(button.dataset.unit));
});

elements.historyList.addEventListener("click", (event) => {
    const historyButton = event.target.closest(".history-button");
    if (!historyButton) return;

    searchWeather(historyButton.dataset.city);
});

elements.clearHistoryButton.addEventListener("click", () => {
    appState.history = [];

    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.warn("Riwayat pencarian tidak dapat dihapus.", error);
    }

    renderHistory();
});

const initializeApp = () => {
    appState.history = getStoredHistory();
    renderHistory();
    searchWeather(DEFAULT_CITY);
};

initializeApp();
