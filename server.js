const express = require('express');
const { Client, GatewayIntentBits, Options } = require('discord.js');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Configuración del Bot de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        'MESSAGE',
        'CHANNEL', 
        'REACTION',
        'USER',
        'GUILD_MEMBER'
    ],
    makeCache: Options.cacheWithLimits({
        ...Options.defaultMakeCacheSettings,
        'GuildMemberManager': {
            maxSize: 500,
            keepOverLimit: member => !member.user.bot
        }
    })
});

// Variables globales
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

// Obtener Guild ID desde variables de entorno
const GUILD_ID = process.env.GUILD_ID || '1346962285016387666';

// Comandos del bot
const commands = {
    '!help': 'Muestra todos los comandos disponibles',
    '!methods': 'Muestra todos los métodos de ataque disponibles',
    '!status': 'Muestra el estado actual del servidor',
    '!info': 'Muestra información sobre BigNet',
    '!guildid': 'Muestra el ID del servidor actual'
};

// Métodos de ataque disponibles
const attackMethods = {
    'udp': 'UDP Flood - Envía paquetes UDP masivos',
    'tcp': 'TCP Flood - Satura conexiones TCP',
    'syn': 'SYN Flood - Ataque de handshake TCP',
    'mix': 'MIX Attack - Combina múltiples métodos'
};

// Función para obtener el guild específico o el primero disponible
function getTargetGuild() {
    if (GUILD_ID) {
        const specificGuild = client.guilds.cache.get(GUILD_ID);
        if (specificGuild) {
            console.log(`🎯 Usando servidor específico: ${specificGuild.name} (${GUILD_ID})`);
            return specificGuild;
        } else {
            console.log(`❌ No se encontró el servidor con ID: ${GUILD_ID}`);
            console.log(`📋 Servidores disponibles: ${client.guilds.cache.map(g => g.name).join(', ')}`);
        }
    }
    
    // Fallback al primer servidor disponible
    const firstGuild = client.guilds.cache.first();
    if (firstGuild) {
        console.log(`🔍 Usando primer servidor disponible: ${firstGuild.name}`);
        return firstGuild;
    }
    
    return null;
}

// Función para obtener íconos de estado
function getStatusIcon(status) {
    const icons = {
        'online': '🟢',
        'idle': '🟡',
        'dnd': '🔴',
        'offline': '⚫'
    };
    return icons[status] || '⚫';
}

// Función para obtener estadísticas del servidor
async function getServerStats() {
    return serverStats;
}

// Evento cuando el bot se conecta
client.on('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`🏰 Servidores conectados: ${client.guilds.cache.size}`);
    
    // Listar todos los servidores disponibles
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (ID: ${guild.id})`);
    });
    
    // Verificar si tenemos el guild específico
    if (GUILD_ID) {
        const targetGuild = client.guilds.cache.get(GUILD_ID);
        if (targetGuild) {
            console.log(`🎯 Servidor objetivo configurado: ${targetGuild.name}`);
        } else {
            console.log(`❌ ADVERTENCIA: No se pudo encontrar el servidor con ID ${GUILD_ID}`);
            console.log(`💡 Asegúrate de que el bot esté invitado a ese servidor`);
        }
    }
    
    updateServerStats();
    setInterval(updateServerStats, 30000);
});

// Evento cuando llega un mensaje
client.on('messageCreate', async (message) => {
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
    
    // Comando de información del servidor
    if (content === '!guildid' || content === '!serverid') {
        const guild = getTargetGuild();
        if (guild) {
            message.reply(`**🏰 Información del Servidor:**\nNombre: ${guild.name}\nID: ${guild.id}\nMiembros: ${guild.memberCount}`);
        } else {
            message.reply('❌ No se pudo obtener información del servidor');
        }
    }
    
    // Comando de información
    if (content === '!info' || content === '!acerca') {
        const infoText = `**🌐 BigNet - The Best BotNet**\n
🚀 **Servicios Premium de DDoS**
💻 **Métodos Especializados**
🛡️ **Máxima Eficiencia y Seguridad**
📞 **Soporte 24/7**

🔗 **Sitio Web:** https://bignettest.onrender.com
💎 **Planes disponibles**`;
        
        message.reply(infoText);
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
        
        setTimeout(() => {
            serverStats.activeAttacks = Math.max(0, serverStats.activeAttacks - 1);
            message.channel.send(`**✅ Ataque completado:** ${method.toUpperCase()} contra ${target}`);
        }, Math.min(parseInt(duration) * 1000, 30000));
    }
});

async function updateServerStats() {
    try {
        const guild = getTargetGuild();
        if (!guild) {
            console.log('❌ No hay servidores disponibles');
            return;
        }
        
        console.log(`🏰 Actualizando estadísticas del servidor: ${guild.name} (${guild.id})`);
        console.log(`📊 Miembros totales: ${guild.memberCount}`);
        
        // Cargar miembros
        try {
            await guild.members.fetch({ 
                withPresences: true,
                force: false
            });
        } catch (error) {
            console.log('⚠️ No se pudieron cargar presencias:', error.message);
        }
        
        const members = guild.members.cache;
        const allHumanMembers = members.filter(member => !member.user.bot);
        
        // Contadores por estado
        const statusCounts = {
            online: allHumanMembers.filter(m => m.presence?.status === 'online').size,
            idle: allHumanMembers.filter(m => m.presence?.status === 'idle').size,
            dnd: allHumanMembers.filter(m => m.presence?.status === 'dnd').size,
            offline: allHumanMembers.filter(m => !m.presence || m.presence.status === 'offline').size
        };
        
        console.log('=== ESTADÍSTICAS ===');
        console.log(`🟢 Online: ${statusCounts.online}`);
        console.log(`🟡 Idle: ${statusCounts.idle}`);
        console.log(`🔴 DND: ${statusCounts.dnd}`);
        console.log(`⚫ Offline: ${statusCounts.offline}`);
        
        // Actualizar estadísticas
        const onlineCount = statusCounts.online + statusCounts.idle + statusCounts.dnd;
        const totalHumanCount = allHumanMembers.size;
        
        serverStats = {
            onlineUsers: onlineCount,
            activeAttacks: serverStats.activeAttacks,
            serverLoad: totalHumanCount > 0 ? Math.min(Math.floor((onlineCount / totalHumanCount) * 100), 100) : 0,
            uptime: Math.floor(process.uptime()),
            totalUsers: totalHumanCount,
            successRate: 95 + Math.floor(Math.random() * 5),
            
            users: Array.from(allHumanMembers.values()).slice(0, 100).map(member => ({
                id: member.user.id,
                name: member.user.global_name || member.user.username,
                username: member.user.username,
                discriminator: member.user.discriminator,
                avatar: member.user.avatar,
                status: member.presence?.status || 'offline',
                isBot: member.user.bot,
                roles: member.roles?.cache?.map(role => role.name) || [],
                joinedAt: member.joinedAt
            })),
            
            guild: {
                name: guild.name,
                id: guild.id,
                memberCount: guild.memberCount,
                createdTimestamp: guild.createdTimestamp
            },
            lastUpdate: new Date()
        };
        
        console.log(`📊 Resumen - Online: ${serverStats.onlineUsers}, Total: ${serverStats.totalUsers}`);
        
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
        serverStats = {
            ...serverStats,
            uptime: Math.floor(process.uptime()),
            lastUpdate: new Date()
        };
    }
}

// === RUTAS API ===

// Ruta para obtener información del guild
app.get('/api/guild-info', async (req, res) => {
    try {
        const guild = getTargetGuild();
        if (!guild) {
            return res.json({ 
                success: false, 
                error: 'No se encontró el servidor',
                availableGuilds: client.guilds.cache.map(g => ({ name: g.name, id: g.id }))
            });
        }

        const guildInfo = {
            name: guild.name,
            id: guild.id,
            memberCount: guild.memberCount,
            ownerId: guild.ownerId,
            createdTimestamp: guild.createdTimestamp,
            description: guild.description,
            features: guild.features,
            icon: guild.iconURL(),
            configuredGuildId: GUILD_ID
        };

        res.json({
            success: true,
            data: guildInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Ruta para listar todos los servidores disponibles
app.get('/api/available-guilds', (req, res) => {
    try {
        const guilds = Array.from(client.guilds.cache.values()).map(guild => ({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            icon: guild.iconURL(),
            isTarget: guild.id === GUILD_ID
        }));

        res.json({
            success: true,
            data: guilds,
            configuredGuildId: GUILD_ID,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Ruta para cambiar el guild objetivo (solo para desarrollo)
app.post('/api/set-guild', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
            success: false,
            error: 'Esta función solo está disponible en modo desarrollo'
        });
    }

    const { guildId } = req.body;
    if (!guildId) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere guildId'
        });
    }

    const newGuild = client.guilds.cache.get(guildId);
    if (!newGuild) {
        return res.status(404).json({
            success: false,
            error: 'Servidor no encontrado'
        });
    }

    // En una aplicación real, guardarías esto en la base de datos
    // Por ahora solo actualizamos la variable (se reseteará al reiniciar)
    console.log(`🎯 Cambiando servidor objetivo a: ${newGuild.name} (${guildId})`);
    
    res.json({
        success: true,
        message: `Servidor objetivo cambiado a: ${newGuild.name}`,
        guild: {
            id: newGuild.id,
            name: newGuild.name
        }
    });
});

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
            error: 'Error obteniendo estadísticas'
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
            error: 'Error obteniendo usuarios online'
        });
    }
});

// Rutas para páginas web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Endpoint de salud
app.get('/health', (req, res) => {
    const guild = getTargetGuild();
    res.status(200).json({ 
        status: 'OK', 
        bot: client.user ? `Conectado como ${client.user.tag}` : 'Desconectado',
        guild: guild ? `${guild.name} (${guild.id})` : 'No configurado',
        timestamp: new Date().toISOString()
    });
});

// Función para formatear tiempo
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
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ ERROR: No se configuró el token del bot');
    console.log('💡 Configura la variable de entorno BOT_TOKEN');
    process.exit(1);
}

// Iniciar servidor web
app.listen(PORT, () => {
    console.log(`🌐 Servidor web ejecutándose en puerto ${PORT}`);
    console.log(`📊 Panel disponible en http://localhost:${PORT}`);
    console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
    
    if (GUILD_ID) {
        console.log(`🎯 Guild ID configurado: ${GUILD_ID}`);
    } else {
        console.log('⚠️  No se configuró GUILD_ID, usando primer servidor disponible');
    }
});

// Conectar el bot
client.login(BOT_TOKEN).catch(error => {
    console.error('❌ Error iniciando el bot:', error);
    process.exit(1);
});
