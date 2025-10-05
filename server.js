const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno desde .env
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración del Bot de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

// Variables globales para almacenar datos del servidor
let serverStats = {
    onlineUsers: 0,
    activeAttacks: 0,
    serverLoad: 0,
    uptime: 0,
    totalUsers: 0,
    successRate: 95,
    users: [],
    guild: null,
    lastUpdate: new Date()
};

// Comandos del bot
const commands = {
    '!attack': 'Inicia un ataque DDoS - Uso: !attack <método> <objetivo> <duración>',
    '!methods': 'Muestra todos los métodos de ataque disponibles',
    '!status': 'Muestra el estado actual del servidor',
    '!help': 'Muestra todos los comandos disponibles'
};

// Métodos de ataque disponibles
const attackMethods = {
    'udp': 'UDP Flood - Envía paquetes UDP masivos',
    'tcp': 'TCP Flood - Satura conexiones TCP',
    'syn': 'SYN Flood - Ataque de handshake TCP',
    'mix': 'MIX Attack - Combina múltiples métodos',
    'vse': 'VSE Protocol - Para Valve Source Engine',
    'fivem': 'FIVEM Attack - Específico para servidores FiveM',
    'ovhudp': 'OVH-UDP - Bypass para protección OVH',
    'ovhtcp': 'OVH-TCP - TCP randomizado para WAF',
    'discord': 'Discord Attack - Específico para Discord'
};

// Evento cuando el bot se conecta
client.on('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    updateServerStats();
    
    // Actualizar estadísticas cada 30 segundos
    setInterval(updateServerStats, 30000);
});

// Evento cuando llega un mensaje
client.on('messageCreate', async (message) => {
    // Ignorar mensajes de otros bots
    if (message.author.bot) return;
    
    const content = message.content.toLowerCase();
    
    // Comando de ayuda
    if (content === '!help' || content === '!comandos') {
        let helpText = '**🤖 Comandos de BigNet Bot:**\n\n';
        for (const [cmd, desc] of Object.entries(commands)) {
            helpText += `**${cmd}** - ${desc}\n`;
        }
        message.reply(helpText);
    }
    
    // Comando de métodos
    if (content === '!methods' || content === '!metodos') {
        let methodsText = '**🎯 Métodos de Ataque Disponibles:**\n\n';
        for (const [method, desc] of Object.entries(attackMethods)) {
            methodsText += `**${method.toUpperCase()}** - ${desc}\n`;
        }
        message.reply(methodsText);
    }
    
    // Comando de estado
    if (content === '!status' || content === '!estado') {
        const stats = await getServerStats();
        const statusText = `**📊 Estado del Servidor BigNet:**\n
👥 Usuarios Conectados: ${stats.onlineUsers}
⚡ Ataques Activos: ${stats.activeAttacks}
🖥️ Carga del Servidor: ${stats.serverLoad}%
⏰ Tiempo Activo: ${formatUptime(stats.uptime)}
📈 Tasa de Éxito: ${stats.successRate}%`;
        
        message.reply(statusText);
    }
    
    // Comando de ataque (simulado)
    if (content.startsWith('!attack')) {
        const args = content.split(' ');
        if (args.length < 4) {
            message.reply('**❌ Uso correcto:** !attack <método> <objetivo> <duración>');
            return;
        }
        
        const method = args[1];
        const target = args[2];
        const duration = args[3];
        
        if (!attackMethods[method]) {
            message.reply(`**❌ Método no válido.** Usa !methods para ver los disponibles.`);
            return;
        }
        
        // Simular inicio de ataque
        serverStats.activeAttacks++;
        
        message.reply(`**🎯 Ataque Iniciado!**\nMétodo: ${method.toUpperCase()}\nObjetivo: ${target}\nDuración: ${duration} segundos\n\n⚠️ **ADVERTENCIA:** Este es un sistema de demostración.`);
        
        // Simular fin de ataque después del tiempo especificado
        setTimeout(() => {
            serverStats.activeAttacks = Math.max(0, serverStats.activeAttacks - 1);
            message.channel.send(`**✅ Ataque completado:** ${method.toUpperCase()} contra ${target}`);
        }, Math.min(parseInt(duration) * 1000, 30000));
    }
    
    // Comando de información
    if (content === '!info' || content === '!acerca') {
        const infoText = `**🌐 BigNet - The Best BotNet**\n
🚀 **Servicios Premium de DDoS**
💻 **9 Métodos Especializados**
🛡️ **Máxima Eficiencia y Seguridad**
📞 **Soporte 24/7**

🔗 **Sitio Web:** https://bignettest.onrender.com
💎 **Planes desde $299**`;
        
        message.reply(infoText);
    }
});

// Función para actualizar estadísticas del servidor
async function updateServerStats() {
    try {
        if (!client.guilds.cache.size) return;
        
        const guild = client.guilds.cache.first();
        if (!guild) return;
        
        // Obtener miembros actualizados
        await guild.members.fetch();
        
        const members = guild.members.cache;
        const onlineMembers = members.filter(member => 
            !member.user.bot && member.presence?.status !== 'offline' && member.presence?.status !== undefined
        );
        
        const totalMembers = members.filter(member => !member.user.bot).size;
        
        // Actualizar estadísticas
        serverStats = {
            onlineUsers: onlineMembers.size,
            activeAttacks: serverStats.activeAttacks, // Mantener contador de ataques
            serverLoad: Math.min(Math.floor((onlineMembers.size / totalMembers) * 100), 100),
            uptime: Math.floor(process.uptime()),
            totalUsers: totalMembers,
            successRate: 95 + Math.floor(Math.random() * 5),
            users: Array.from(onlineMembers.values()).slice(0, 20).map(member => ({
                id: member.user.id,
                name: member.user.global_name || member.user.username,
                username: member.user.username,
                discriminator: member.user.discriminator,
                avatar: member.user.avatar,
                status: member.presence?.status || 'offline',
                isBot: member.user.bot,
                roles: member.roles.cache.map(role => role.name)
            })),
            guild: {
                name: guild.name,
                id: guild.id,
                memberCount: guild.memberCount,
                createdTimestamp: guild.createdTimestamp
            },
            lastUpdate: new Date()
        };
        
        console.log(`📊 Estadísticas actualizadas - ${serverStats.onlineUsers} usuarios online`);
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
    }
}

// Función para obtener estadísticas
async function getServerStats() {
    return serverStats;
}

// API Routes para la página web

// Obtener estadísticas del servidor
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getServerStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas',
            timestamp: new Date().toISOString()
        });
    }
});

// Obtener información del guild
app.get('/api/guild', async (req, res) => {
    try {
        const stats = await getServerStats();
        res.json({
            success: true,
            data: stats.guild,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo información del servidor',
            timestamp: new Date().toISOString()
        });
    }
});

// Obtener usuarios online
app.get('/api/online-users', async (req, res) => {
    try {
        const stats = await getServerStats();
        res.json({
            success: true,
            data: stats.users,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo usuarios online',
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para enviar notificaciones a Discord
app.post('/api/notify', async (req, res) => {
    try {
        const { message, type = 'info' } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un mensaje'
            });
        }
        
        // Encontrar canal de notificaciones
        const guild = client.guilds.cache.first();
        if (!guild) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo encontrar el servidor'
            });
        }
        
        const channel = guild.channels.cache.find(ch => 
            ch.type === 0 && ch.name.includes('general')
        );
        
        if (channel) {
            await channel.send(`**🌐 Notificación Web:** ${message}`);
        }
        
        res.json({
            success: true,
            message: 'Notificación enviada',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error enviando notificación',
            timestamp: new Date().toISOString()
        });
    }
});

// Servir la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Rutas para términos y privacidad
app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
// Iniciar servidor web
app.listen(PORT, () => {
    console.log(`🌐 Servidor web ejecutándose en puerto ${PORT}`);
    console.log(`📊 API disponible en http://localhost:${PORT}/api/stats`);
});

// Función utilitaria para formatear tiempo
function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Apagando bot...');
    client.destroy();
    process.exit(0);
});

// Iniciar el bot de Discord
const BOT_TOKEN = process.env.BOT_TOKEN || 'MTQyMzg2MzQ3MjQxNjEwMDQ1NQ.GkedgQ.U6P1uYhMwx6y8fO6CQu8J65di43bVhNuaHGP2s';

if (!BOT_TOKEN || BOT_TOKEN === 'TU_BOT_TOKEN_AQUI') {
    console.error('❌ ERROR: No se configuró el token del bot');
    console.log('💡 Configura la variable de entorno BOT_TOKEN');
    process.exit(1);
}

client.login(BOT_TOKEN).catch(error => {
    console.error('❌ Error iniciando el bot:', error);
    process.exit(1);
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});
// Endpoint para procesar compras (opcional)
app.post('/api/purchase', async (req, res) => {
    try {
        const { product, discordId, price } = req.body;
        
        // Aquí puedes agregar lógica de procesamiento
        console.log('Nueva compra recibida:', { product, discordId, price });
        
        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({ 
            success: true, 
            message: 'Compra procesada correctamente',
            orderId: 'ORD-' + Date.now()
        });
    } catch (error) {
        console.error('Error procesando compra:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Endpoint de salud para Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'BigNet Website'
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Iniciar servidor


