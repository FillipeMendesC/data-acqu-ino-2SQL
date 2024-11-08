const serialport = require('serialport');
const mysql = require('mysql2');
const dotenv = require("dotenv");

// Troque para o seu ambiente atual
const ambiente_processo = 'desenvolvimento';
const caminho_env = ambiente_processo === 'producao' ? '.env' : '.env.dev';
dotenv.config({ path: caminho_env });

const SERIAL_BAUD_RATE = 9600;

var mySqlConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
};

const serial = async () => {
    let poolBancoDados = mysql.createPool(mySqlConfig).promise();

    const portas = await serialport.SerialPort.list();
    const portaArduino = portas.find((porta) => porta.vendorId == 2341 && porta.productId == 43);
    if (!portaArduino) {
        throw new Error('O arduino não foi encontrado em nenhuma porta serial');
    }

    const arduino = new serialport.SerialPort(
        {
            path: portaArduino.path,
            baudRate: SERIAL_BAUD_RATE
        }
    );

    arduino.on('open', () => {
        console.log(`A leitura do arduino foi iniciada na porta ${portaArduino.path} utilizando Baud Rate de ${SERIAL_BAUD_RATE}`);
    });

    arduino.pipe(new serialport.ReadlineParser({ delimiter: '\r\n' })).on('data', async (data) => {
        console.log(data);
        const valores = data.split(';');

        // Adicione ou remova para o seu caso
        const sensor1 = parseInt(valores[0]);
        const sensor2 = parseFloat(valores[1]);

        await poolBancoDados.execute(
            'INSERT INTO leitura (dado1, dado2) VALUES (?, ?)',
            [sensor1, sensor2]
        );
        console.log("valores inseridos no banco: ", sensor1 + ", " + sensor2);
    });

    arduino.on('error', (mensagem) => {
        console.error(`Erro no arduino (Mensagem: ${mensagem}`)
    });
}

// Inicia os processos de leitura e insert
serial();