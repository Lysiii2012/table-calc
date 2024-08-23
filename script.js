document.getElementById('convert').addEventListener('click', convertCurrency);

async function getExchangeRates() {
    const htmlUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRowrmbKkwzp3PBHemlx3cIBMtPADK0FFZJEz5iT9pjoJD2VEKE35d0BOToFnUnYzacnToHqh5Z4sGt/pubhtml'; // Опубликованный HTML
    try {
        const response = await fetch(htmlUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const htmlText = await response.text();
        const rates = parseHTML(htmlText);
        console.log('Parsed rates:', rates); // Для отладки
        updateCurrencySelectors(rates);
        return rates;
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
        console.log(`Row ${rowIndex} cells:`, Array.from(cells).map(cell => cell.innerText.trim())); // Отладка
        if (rowIndex === 0) {
            // Первая строка содержит заголовки для целевых валют (начиная со второго столбца)
            cells.forEach((cell, index) => {
                if (index > 0) { // Начинаем со второго столбца
                    headers[index - 1] = cell.innerText.trim(); // Заголовки для обменных курсов
                }
            });
        } else {
            // Остальные строки содержат обменные курсы
            const baseCurrency = cells[1].innerText.trim(); // Первая ячейка — это исходная валюта
            if (baseCurrency) {
                rates[baseCurrency] = {};
                cells.forEach((cell, index) => {
                    if (index > 0 && headers[index - 1]) { // Начинаем со второго столбца
                        const rateText = cell.innerText.trim();
                        const rate = parseFloat(rateText.replace(',', '.')); // Замена запятой на точку для парсинга чисел
                        if (!isNaN(rate)) {
                            rates[baseCurrency][headers[index - 1]] = rate;
                        }
                    }
                });
            }
        }
    });

    console.log('Parsed rates:', rates); // Для отладки
    return rates;
}

function updateCurrencySelectors(rates) {
    const fromCurrencySelect = document.getElementById('from-currency');
    const toCurrencySelect = document.getElementById('to-currency');

    // Сначала очищаем существующие опции
    fromCurrencySelect.innerHTML = '';
    toCurrencySelect.innerHTML = '';

    // Создаем наборы валют, которые имеют заполненные курсы
    const fromCurrencies = new Set();
    const toCurrencies = new Set();

    for (const baseCurrency in rates) {
        fromCurrencies.add(baseCurrency);
        for (const targetCurrency in rates[baseCurrency]) {
            if (rates[baseCurrency][targetCurrency]) {
                toCurrencies.add(targetCurrency);
            }
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

async function convertCurrency() {
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;
    const amount = parseFloat(document.getElementById('amount').value);

    const rates = await getExchangeRates();

    if (rates) {
        console.log('Available rates:', rates); // Для отладки

        if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
            const rate = rates[fromCurrency][toCurrency];
            const result = amount * rate;
            document.getElementById('result').textContent = `${amount} ${fromCurrency} = ${result.toFixed(8)} ${toCurrency}`;
        } else {
            document.getElementById('result').textContent = 'Ошибка конвертации. Проверьте, что вы выбрали существующие валюты и что данные в таблице корректны.';
            console.error('Conversion error:', { fromCurrency, toCurrency, rates });
        }
    } else {
        document.getElementById('result').textContent = 'Ошибка при загрузке данных обменного курса.';
    }
}

// Инициализируем селекты при загрузке страницы
getExchangeRates();
