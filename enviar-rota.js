const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

// --- CONFIGURAÇÕES ---
const NUMERO_DESTINO = '5511964531070@c.us'; // Número que receberá a rota
const DB_FILE = './agendamentos.json';
// ---------------------

// Função para ler o banco de dados de agendamentos
const readDatabase = () => {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            return data ? JSON.parse(data) : {};
        }
    } catch (error) {
        console.error('Erro ao ler o arquivo de agendamentos:', error);
    }
    return {};
};

// Função para pegar a data de amanhã no formato YYYY-MM-DD
const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Usa um ID de cliente diferente para não conflitar com a sessão do bot principal
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'enviar-rota-session' })
});

client.on('qr', qr => {
    console.log('--- SCRIPT DE ENVIO DE ROTA ---');
    console.log('Escaneie este QR Code com seu WhatsApp para autenticar o enviador de rotas (apenas na primeira vez).');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Cliente pronto para enviar a rota!');

    const tomorrowDate = getTomorrowDateString();
    const db = readDatabase();
    const appointments = db[tomorrowDate] || [];

    const friendlyDate = tomorrowDate.split('-').reverse().join('/');
    let messageText;

    if (appointments.length === 0) {
        messageText = `Nenhuma coleta agendada para amanhã (${friendlyDate}).`;
    } else if (appointments.length < 2) {
        messageText = `Apenas 1 coleta agendada para amanhã (${friendlyDate}).\n\n*Endereço:* ${appointments[0].address}`;
    } else {
        const addresses = appointments.map(appt => appt.address);
        const baseUrl = 'https://www.google.com/maps/dir/';
        const encodedAddresses = addresses.map(addr => encodeURIComponent(addr)).join('/');
        const finalUrl = baseUrl + encodedAddresses;

        messageText = `*Rota de Coleta para Amanhã (${friendlyDate})*  маршрут\n\n` +
                      `*Total de Paradas:* ${addresses.length}\n\n` +
                      `*Link da Rota Otimizada:*\n${finalUrl}`;
    }

    try {
        await client.sendMessage(NUMERO_DESTINO, messageText);
        console.log(`Mensagem com a rota enviada para ${NUMERO_DESTINO}`);
    } catch (error) {
        console.error('Falha ao enviar a mensagem:', error);
    } finally {
        console.log('Script finalizado.');
        await client.destroy();
    }
});

client.on('auth_failure', msg => {
    console.error('FALHA NA AUTENTICAÇÃO DO ENVIADOR DE ROTA:', msg);
});

console.log('Iniciando script de envio de rota...');
client.initialize();