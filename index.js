const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const DB_FILE = './agendamentos.json';
const DAILY_LIMIT = 10;
const COLLECTION_DAYS = {
    'segunda': 1, // 1 = Monday
    'quarta': 3,  // 3 = Wednesday
    'sexta': 5    // 5 = Friday
};

// Função para ler o "banco de dados" em JSON
const readDatabase = () => {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            // Evita erro de parse em arquivo vazio
            return data ? JSON.parse(data) : {};
        }
    } catch (error) {
        console.error('Erro ao ler o banco de dados:', error);
    }
    return {}; // Retorna um objeto vazio se o arquivo não existir ou der erro
};

// Função para escrever no "banco de dados" em JSON
const writeDatabase = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao escrever no banco de dados:', error);
    }
};

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

const userState = new Map();

// Função para encontrar a próxima data de coleta disponível
const findNextAvailableSlot = (preferredDay) => {
    const db = readDatabase();
    let startDate = new Date();
    
    // Se o dia preferido já passou nesta semana, começa a busca a partir de hoje
    const preferredDayIndex = COLLECTION_DAYS[preferredDay];
    if (startDate.getDay() > preferredDayIndex) {
        // Não faz nada, a busca a partir de hoje já resolve
    }

    // Procura por uma vaga nos próximos 30 dias
    for (let i = 0; i < 30; i++) {
        let checkingDate = new Date();
        checkingDate.setDate(startDate.getDate() + i);

        const dayOfWeek = checkingDate.getDay();
        const isCollectionDay = Object.values(COLLECTION_DAYS).includes(dayOfWeek);

        if (isCollectionDay) {
            const dateString = checkingDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const appointments = db[dateString] || [];
            if (appointments.length < DAILY_LIMIT) {
                const dayName = Object.keys(COLLECTION_DAYS).find(key => COLLECTION_DAYS[key] === dayOfWeek);
                return { date: dateString, dayName: dayName };
            }
        }
    }
    return null; // Nenhuma vaga encontrada
};


client.on('message', async message => {
    const contact = await message.getContact();
    const chat = await message.getChat();
    const user = contact.pushname || message._data.notifyName || contact.number;
    const userIdentifier = chat.id._serialized;

    if (message.body.toLowerCase() === 'cancelar') {
        userState.delete(userIdentifier);
        message.reply('Agendamento cancelado. Comece de novo a qualquer momento.');
        return;
    }

    if (!userState.has(userIdentifier)) {
        userState.set(userIdentifier, { step: 'initial' });
        message.reply(`Olá ${user}, tudo bem?\n\nDigite o número da opção desejada:\n1. Agendar coleta\n2. Outro assunto`);
        return;
    }

    const state = userState.get(userIdentifier);

    switch (state.step) {
        case 'initial':
            if (message.body === '1') {
                userState.set(userIdentifier, { step: 'getName' });
                message.reply('Ótimo! Para agendar a coleta, por favor, me diga seu nome completo.');
            } else if (message.body === '2') {
                message.reply('Por favor, aguarde. Em breve um de nossos atendentes irá te ajudar.');
                userState.delete(userIdentifier);
            } else {
                message.reply('Opção inválida. Por favor, digite 1 para agendar uma coleta ou 2 para outro assunto.');
            }
            break;

        case 'getName':
            userState.set(userIdentifier, { ...state, name: message.body, step: 'getAddress' });
            message.reply('Obrigado! Agora, por favor, me informe o endereço completo para a coleta.');
            break;

        case 'getAddress':
            userState.set(userIdentifier, { ...state, address: message.body, step: 'getDay' });
            message.reply('Endereço anotado. Agora escolha um dos dias para a coleta:\n- Segunda\n- Quarta\n- Sexta');
            break;

        case 'getDay':
            const chosenDayRaw = message.body.toLowerCase().replace('-feira', '');
            if (!COLLECTION_DAYS[chosenDayRaw]) {
                message.reply('Dia inválido. Por favor, escolha um dos dias disponíveis: Segunda, Quarta ou Sexta.');
                return;
            }

            const slot = findNextAvailableSlot(chosenDayRaw);

            if (slot) {
                const [year, month, day] = slot.date.split('-');
                const friendlyDate = `${day}/${month}/${year}`;
                const dayNameCapitalized = slot.dayName.charAt(0).toUpperCase() + slot.dayName.slice(1);

                let replyMessage = `Ótimo! Conseguimos um horário para *${dayNameCapitalized}-feira (${friendlyDate})*.`;
                
                userState.set(userIdentifier, { ...state, date: slot.date, dayName: slot.dayName, step: 'getPeriod' });
                message.reply(replyMessage + '\n\nAgora, por favor, escolha o período:\n- Manhã\n- Tarde\n- Noite');
            } else {
                message.reply('Desculpe, não há vagas de coleta disponíveis no momento. Por favor, tente novamente mais tarde.');
                userState.delete(userIdentifier);
            }
            break;

        case 'getPeriod':
            const chosenPeriod = message.body.toLowerCase();
            const availablePeriods = ['manhã', 'tarde', 'noite'];

            if (availablePeriods.includes(chosenPeriod)) {
                userState.set(userIdentifier, { ...state, period: message.body, step: 'getLiters' });
                message.reply('Período anotado. Para finalizar, quantos litros de óleo você deseja coletar?');
            } else {
                message.reply('Período inválido. Por favor, escolha um dos períodos disponíveis: Manhã, Tarde ou Noite.');
            }
            break;

        case 'getLiters':
            const liters = message.body;
            const db = readDatabase();
            
            const finalData = { 
                name: state.name,
                address: state.address,
                period: state.period,
                liters: liters,
                timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            };

            if (!db[state.date]) {
                db[state.date] = [];
            }

            db[state.date].push(finalData);
            writeDatabase(db);

            userState.delete(userIdentifier);

            const [year, month, day] = state.date.split('-');
            const friendlyDate = `${day}/${month}/${year}`;
            const finalDayCapitalized = state.dayName.charAt(0).toUpperCase() + state.dayName.slice(1);

            const summary = `*Agendamento de Coleta Confirmado* ✅\n\n*Nome:* ${finalData.name}\n*Endereço:* ${finalData.address}\n*Dia da Coleta:* ${finalDayCapitalized}-feira (${friendlyDate})\n*Período:* ${finalData.period}\n*Quantidade:* ${liters} litros\n\nObrigado por agendar conosco!`;
            message.reply(summary);
            break;
    }
});

client.initialize();