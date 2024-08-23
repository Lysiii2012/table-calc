let exchangeRates = null;

async function getExchangeRates() {
    const htmlUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRowrmbKkwzp3PBHemlx3cIBMtPADK0FFZJEz5iT9pjoJD2VEKE35d0BOToFnUnYzacnToHqh5Z4sGt/pubhtml';
    try {
        const response = await fetch(htmlUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const htmlText = await response.text();
        return parseHTML(htmlText);
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        return null;
    }
}

function parseHTML(htmlText) {
    const rates = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const table = doc.querySelector('table.waffle');

    if (!table) {
        console.error('Не удалось найти таблицу в HTML.');
        return null;
    }

    const rows = table.querySelectorAll('tbody tr');
    let headers = [];

    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td, th');
        if (rowIndex === 0) {
            // Первая строка содержит заголовки для целевых валют (начиная со второго столбца)
            cells.forEach((cell, index) => {
                if (index > 0) { 
                    headers[index - 1] = cell.innerText.trim(); 
                }
            });
        } else {
            // Остальные строки содержат обменные курсы
            const baseCurrency = cells[1].innerText.trim();
            if (baseCurrency) {
                rates[baseCurrency] = {};
                cells.forEach((cell, index) => {
                    if (index > 0 && headers[index - 1]) {
                        const rateText = cell.innerText.trim();
                        const rate = parseFloat(rateText.replace(',', '.'));
                        if (!isNaN(rate)) {
                            rates[baseCurrency][headers[index - 1]] = rate;
                        }
                    }
                });
            }
        }
    });

    console.log('Parsed rates:', rates); 
    return rates;
}

function invertRates(rates) {
    const invertedRates = {};
    for (const baseCurrency in rates) {
        for (const targetCurrency in rates[baseCurrency]) {
            const rate = rates[baseCurrency][targetCurrency];
            if (!invertedRates[targetCurrency]) {
                invertedRates[targetCurrency] = {};
            }
            invertedRates[targetCurrency][baseCurrency] = 1 / rate; // Инвертируем курс
        }
    }
    return invertedRates;
}

function updateCurrencySelectors(rates) {
    const fromCurrencySelect = document.getElementById('from-currency');
    const toCurrencySelect = document.getElementById('to-currency');

    // Очистка существующих опций
    fromCurrencySelect.innerHTML = '';
    toCurrencySelect.innerHTML = '';

    // Создаем наборы валют
    const fromCurrencies = new Set();
    const toCurrencies = new Set();

    for (const baseCurrency in rates) {
        fromCurrencies.add(baseCurrency);
        for (const targetCurrency in rates[baseCurrency]) {
            toCurrencies.add(targetCurrency);
        }
    }

    // Добавляем валюты в селекты
    fromCurrencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = currency;
        fromCurrencySelect.appendChild(option);
    });

    toCurrencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency;
        option.textContent = currency;
        toCurrencySelect.appendChild(option);
    });
}

function convertCurrency() {
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;
    const amountFrom = parseFloat(document.getElementById('amount-from').value);

    // Проверяем, что валюты выбраны и сумма валидна
    if (!fromCurrency || !toCurrency || isNaN(amountFrom)) {
        document.getElementById('result').textContent = 'Пожалуйста, выберите валюты и введите корректную сумму.';
        return;
    }

    if (exchangeRates) {
        // Проверяем наличие курсов для выбранных валют
        if (exchangeRates[fromCurrency] && exchangeRates[fromCurrency][toCurrency]) {
            const rate = exchangeRates[fromCurrency][toCurrency];
            const result = amountFrom * rate;
            document.getElementById('amount-to').value = result.toFixed(8);
            document.getElementById('result').textContent = ''; // Очищаем сообщение об ошибке
        } else {
            document.getElementById('result').textContent = 'Ошибка конвертации. Проверьте выбранные валюты и данные в таблице.';
            console.error('Conversion error:', { fromCurrency, toCurrency, rates: exchangeRates });
        }
    } else {
        document.getElementById('result').textContent = 'Ошибка при загрузке данных обменного курса.';
    }
}


let isSwapped = false; // Флаг для отслеживания текущего состояния инверсии

async function swapCurrencies() {
    // Проверяем текущее состояние инверсии
    const fromCurrencySelect = document.getElementById('from-currency');
    const toCurrencySelect = document.getElementById('to-currency');
    const fromAmountInput = document.getElementById('amount-from');
    const toAmountInput = document.getElementById('amount-to');

    // Сохраняем текущие значения
    const currentFromCurrency = fromCurrencySelect.value;
    const currentToCurrency = toCurrencySelect.value;
    const currentFromAmount = fromAmountInput.value;
    const currentToAmount = toAmountInput.value;

    // Запрашиваем новые данные с таблицы
    exchangeRates = await getExchangeRates();
    
    if (exchangeRates) {
        // Инвертируем данные
        exchangeRates = invertRates(exchangeRates);
        
        // Обновляем селекторы с новыми данными
        updateCurrencySelectors(exchangeRates);
        
        // Смена местами валют
        fromCurrencySelect.value = currentToCurrency;
        toCurrencySelect.value = currentFromCurrency;
        
        // Смена местами значений
        fromAmountInput.value = currentToAmount;
        toAmountInput.value = currentFromAmount;

        // Запускаем новую конвертацию
        convertCurrency();
    } else {
        document.getElementById('result').textContent = 'Ошибка при загрузке данных обменного курса.';
    }
}


// Инициализируем селекты и сохраняем курсы при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    exchangeRates = await getExchangeRates();
    if (exchangeRates) {
        updateCurrencySelectors(exchangeRates);
        convertCurrency(); // Первоначальная конверсия
    }
});

document.getElementById('amount-from').addEventListener('input', convertCurrency);
document.getElementById('from-currency').addEventListener('change', convertCurrency);
document.getElementById('to-currency').addEventListener('change', convertCurrency);
document.getElementById('swap-currencies').addEventListener('click', swapCurrencies);
