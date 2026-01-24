import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Linking,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, MessageCircle, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';

const COLORS = {
    background: '#FFFFFF',
    text: '#111111',
    textSecondary: '#6B7280',
    primaryBlue: '#1275FF',
    success: '#0BBE7D',
    successLight: '#DCFCE7',
    whatsapp: '#25D366',
};

const WHATSAPP_NUMBER = '+19567738844';
const WHATSAPP_DISPLAY = '+1 956-773-8844';

export default function QuoteSubmittedScreen() {
    const router = useRouter();
    const { language } = useApp();
    const scaleAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, [scaleAnim]);

    const handleWhatsAppPress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        const message = language === 'es'
            ? 'Hola, acabo de subir mi póliza en Saver. ¿Pueden ayudarme con una cotización?'
            : 'Hi, I just uploaded my policy on Saver. Can you help me with a quote?';
        const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url);
    };

    const text = {
        title: language === 'es' ? '¡Enviado!' : 'Submitted!',
        message: language === 'es'
            ? 'Recibimos tu póliza y tus datos.'
            : 'We received your policy and details.',
        nextStep: language === 'es'
            ? 'Te contactaremos por WhatsApp:'
            : "We'll contact you via WhatsApp:",
        whatsappButton: language === 'es' ? 'Enviar mensaje ahora' : 'Send a message now',
        timeNote: language === 'es'
            ? 'Normalmente respondemos en menos de 24 horas.'
            : 'We typically respond within 24 hours.',
        button: language === 'es' ? 'Volver al inicio' : 'Go to Home',
    };

    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
            <View style={styles.content}>
                <Animated.View
                    style={[
                        styles.iconContainer,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <CheckCircle size={72} color={COLORS.success} />
                </Animated.View>

                <Text style={styles.title}>{text.title}</Text>
                <Text style={styles.message}>{text.message}</Text>

                <View style={styles.whatsappSection}>
                    <Text style={styles.nextStepText}>{text.nextStep}</Text>
                    <View style={styles.phoneRow}>
                        <Phone size={18} color={COLORS.whatsapp} />
                        <Text style={styles.phoneNumber}>{WHATSAPP_DISPLAY}</Text>
                    </View>
                    
                    <TouchableOpacity
                        style={styles.whatsappButton}
                        onPress={handleWhatsAppPress}
                        activeOpacity={0.8}
                    >
                        <MessageCircle size={20} color="#FFFFFF" />
                        <Text style={styles.whatsappButtonText}>{text.whatsappButton}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.timeNote}>{text.timeNote}</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.replace('/')}
                >
                    <Text style={styles.buttonText}>{text.button}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    iconContainer: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700' as const,
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 17,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    whatsappSection: {
        width: '100%',
        backgroundColor: COLORS.successLight,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    nextStepText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '600' as const,
        marginBottom: 12,
        textAlign: 'center',
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    phoneNumber: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: COLORS.whatsapp,
    },
    whatsappButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.whatsapp,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 10,
        width: '100%',
    },
    whatsappButtonText: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: '#FFFFFF',
    },
    timeNote: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    button: {
        backgroundColor: COLORS.primaryBlue,
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 14,
        minWidth: 200,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: '#FFFFFF',
    },
});
