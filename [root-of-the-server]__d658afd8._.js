module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/services/web/src/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "debounce",
    ()=>debounce,
    "formatDate",
    ()=>formatDate,
    "formatDateTime",
    ()=>formatDateTime,
    "formatDuration",
    ()=>formatDuration,
    "generateId",
    ()=>generateId,
    "throttle",
    ()=>throttle,
    "truncateText",
    ()=>truncateText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
function formatDateTime(date) {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = seconds % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${remainingSeconds}s`;
    }
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
function debounce(func, wait) {
    let timeout;
    return (...args)=>{
        clearTimeout(timeout);
        timeout = setTimeout(()=>func(...args), wait);
    };
}
function throttle(func, limit) {
    let inThrottle;
    return (...args)=>{
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(()=>inThrottle = false, limit);
        }
    };
}
}),
"[project]/services/web/src/components/ui/Alert.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Alert",
    ()=>Alert
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/web/src/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$alert$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/alert-circle.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check-circle.js [app-ssr] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/info.js [app-ssr] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$alert$2d$triangle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/alert-triangle.js [app-ssr] (ecmascript) <export default as AlertTriangle>");
;
;
;
;
const Alert = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"])(({ className, variant = 'default', title, children, ...props }, ref)=>{
    const variants = {
        default: {
            container: 'bg-blue-50 border-blue-200 text-blue-800',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"],
            iconColor: 'text-blue-400'
        },
        success: {
            container: 'bg-green-50 border-green-200 text-green-800',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"],
            iconColor: 'text-green-400'
        },
        warning: {
            container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$alert$2d$triangle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"],
            iconColor: 'text-yellow-400'
        },
        error: {
            container: 'bg-red-50 border-red-200 text-red-800',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$alert$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"],
            iconColor: 'text-red-400'
        }
    };
    const { container, icon: Icon, iconColor } = variants[variant];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('relative w-full rounded-lg border p-4', container, className),
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-shrink-0",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('h-5 w-5', iconColor)
                    }, void 0, false, {
                        fileName: "[project]/services/web/src/components/ui/Alert.tsx",
                        lineNumber: 49,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/services/web/src/components/ui/Alert.tsx",
                    lineNumber: 48,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "ml-3",
                    children: [
                        title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-sm font-medium mb-1",
                            children: title
                        }, void 0, false, {
                            fileName: "[project]/services/web/src/components/ui/Alert.tsx",
                            lineNumber: 53,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-sm",
                            children: children
                        }, void 0, false, {
                            fileName: "[project]/services/web/src/components/ui/Alert.tsx",
                            lineNumber: 55,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/services/web/src/components/ui/Alert.tsx",
                    lineNumber: 51,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/services/web/src/components/ui/Alert.tsx",
            lineNumber: 47,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/services/web/src/components/ui/Alert.tsx",
        lineNumber: 38,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
Alert.displayName = 'Alert';
;
}),
"[project]/services/web/src/components/auth/SessionManager.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$components$2f$ui$2f$Alert$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/web/src/components/ui/Alert.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function useAuth() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [sessionExpired, setSessionExpired] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Enhanced authentication with proper password validation
    const login = async (email, password, rememberMe = false)=>{
        setLoading(true);
        try {
            // Simulate API call with proper validation
            await new Promise((resolve)=>setTimeout(resolve, 1000));
            // Mock user database with hashed passwords (in real app, this would be server-side)
            const mockUsers = [
                {
                    id: '1',
                    email: 'john@example.com',
                    // This would be a bcrypt hash in real implementation
                    passwordHash: 'hashed_password_123',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'user',
                    subscription: {
                        tier: 'free',
                        usage: {
                            sessionsUsed: 3,
                            sessionsLimit: 5
                        }
                    },
                    createdAt: '2024-01-01T00:00:00Z'
                },
                {
                    id: '2',
                    email: 'demo@example.com',
                    passwordHash: 'demo_password_hash',
                    firstName: 'Demo',
                    lastName: 'User',
                    role: 'user',
                    subscription: {
                        tier: 'pro',
                        nextBillingDate: '2024-02-01T00:00:00Z',
                        usage: {
                            sessionsUsed: 8,
                            sessionsLimit: undefined
                        }
                    },
                    createdAt: '2023-12-01T00:00:00Z'
                }
            ];
            // Find user by email
            const foundUser = mockUsers.find((u)=>u.email.toLowerCase() === email.toLowerCase());
            if (!foundUser) {
                throw new Error('Invalid email or password');
            }
            // Simulate password verification (in real app, use bcrypt.compare)
            const isValidPassword = await verifyPassword(password, foundUser.passwordHash);
            if (!isValidPassword) {
                // Implement rate limiting check
                await checkRateLimit(email);
                throw new Error('Invalid email or password');
            }
            // Create user object without password hash
            const { passwordHash, ...userWithoutPassword } = foundUser;
            const authenticatedUser = userWithoutPassword;
            setUser(authenticatedUser);
            // Store session info
            const sessionData = {
                user: authenticatedUser,
                expiresAt: rememberMe ? Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
                 : Date.now() + 24 * 60 * 60 * 1000
            };
            localStorage.setItem('auth_session', JSON.stringify(sessionData));
            // Clear any rate limiting for successful login
            clearRateLimit(email);
        } catch (error) {
            throw error;
        } finally{
            setLoading(false);
        }
    };
    // Mock password verification (in real app, use bcrypt)
    const verifyPassword = async (password, hash)=>{
        // Simulate password hashing verification
        await new Promise((resolve)=>setTimeout(resolve, 100));
        // For demo purposes, accept specific passwords
        const validPasswords = {
            'hashed_password_123': 'password123',
            'demo_password_hash': 'demo123'
        };
        return validPasswords[hash] === password;
    };
    // Rate limiting implementation
    const checkRateLimit = async (email)=>{
        const rateLimitKey = `rate_limit_${email}`;
        const rateLimitData = localStorage.getItem(rateLimitKey);
        if (rateLimitData) {
            const { attempts, lastAttempt } = JSON.parse(rateLimitData);
            const now = Date.now();
            const timeSinceLastAttempt = now - lastAttempt;
            // Reset attempts after 15 minutes
            if (timeSinceLastAttempt > 15 * 60 * 1000) {
                localStorage.removeItem(rateLimitKey);
                return;
            }
            // Check if rate limited
            if (attempts >= 5) {
                const remainingTime = Math.ceil((15 * 60 * 1000 - timeSinceLastAttempt) / 60000);
                throw new Error(`Too many failed attempts. Please try again in ${remainingTime} minutes.`);
            }
            // Increment attempts
            localStorage.setItem(rateLimitKey, JSON.stringify({
                attempts: attempts + 1,
                lastAttempt: now
            }));
        } else {
            // First failed attempt
            localStorage.setItem(rateLimitKey, JSON.stringify({
                attempts: 1,
                lastAttempt: Date.now()
            }));
        }
    };
    const clearRateLimit = (email)=>{
        const rateLimitKey = `rate_limit_${email}`;
        localStorage.removeItem(rateLimitKey);
    };
    const register = async (userData)=>{
        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve)=>setTimeout(resolve, 1000));
            // Mock successful registration
            const mockUser = {
                id: '1',
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: 'user',
                subscription: {
                    tier: 'free',
                    usage: {
                        sessionsUsed: 0,
                        sessionsLimit: 5
                    }
                }
            };
            setUser(mockUser);
            // Store session info
            const sessionData = {
                user: mockUser,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000
            };
            localStorage.setItem('auth_session', JSON.stringify(sessionData));
        } catch (error) {
            throw new Error('Registration failed. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    const logout = async ()=>{
        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve)=>setTimeout(resolve, 500));
            setUser(null);
            localStorage.removeItem('auth_session');
            setSessionExpired(false);
        } catch (error) {
            console.error('Logout error:', error);
        } finally{
            setLoading(false);
        }
    };
    const resetPassword = async (email)=>{
        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve)=>setTimeout(resolve, 1000));
            // In real app, this would send reset email
            console.log('Password reset email sent to:', email);
        } catch (error) {
            throw new Error('Failed to send reset email. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    const refreshSession = async ()=>{
        try {
            const sessionData = localStorage.getItem('auth_session');
            if (!sessionData) return;
            const { user: storedUser, expiresAt } = JSON.parse(sessionData);
            if (Date.now() > expiresAt) {
                // Session expired
                localStorage.removeItem('auth_session');
                setSessionExpired(true);
                setUser(null);
                return;
            }
            // Simulate API call to refresh session
            await new Promise((resolve)=>setTimeout(resolve, 500));
            setUser(storedUser);
        } catch (error) {
            console.error('Session refresh error:', error);
            localStorage.removeItem('auth_session');
            setUser(null);
        }
    };
    const updateProfile = async (profileData)=>{
        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve)=>setTimeout(resolve, 1000));
            if (user) {
                const updatedUser = {
                    ...user,
                    ...profileData
                };
                setUser(updatedUser);
                // Update stored session
                const sessionData = localStorage.getItem('auth_session');
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    session.user = updatedUser;
                    localStorage.setItem('auth_session', JSON.stringify(session));
                }
            }
        } catch (error) {
            throw new Error('Failed to update profile. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    const updateSettings = async (settings)=>{
        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve)=>setTimeout(resolve, 1000));
            if (user) {
                const updatedUser = {
                    ...user,
                    settings: {
                        ...user.settings,
                        ...settings
                    }
                };
                setUser(updatedUser);
                // Update stored session
                const sessionData = localStorage.getItem('auth_session');
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    session.user = updatedUser;
                    localStorage.setItem('auth_session', JSON.stringify(session));
                }
            }
        } catch (error) {
            throw new Error('Failed to update settings. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    const upgradePlan = async (planId)=>{
        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve)=>setTimeout(resolve, 2000));
            if (user) {
                const planLimits = {
                    free: {
                        sessionsLimit: 5
                    },
                    pro: {
                        sessionsLimit: undefined
                    },
                    enterprise: {
                        sessionsLimit: undefined
                    } // Unlimited
                };
                const updatedUser = {
                    ...user,
                    subscription: {
                        ...user.subscription,
                        tier: planId,
                        usage: {
                            ...user.subscription.usage,
                            ...planLimits[planId]
                        },
                        nextBillingDate: planId !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined
                    }
                };
                setUser(updatedUser);
                // Update stored session
                const sessionData = localStorage.getItem('auth_session');
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    session.user = updatedUser;
                    localStorage.setItem('auth_session', JSON.stringify(session));
                }
            }
        } catch (error) {
            throw new Error('Failed to upgrade plan. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    const deleteAccount = async ()=>{
        setLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve)=>setTimeout(resolve, 2000));
            // Clear all data
            setUser(null);
            localStorage.removeItem('auth_session');
            // In a real app, this would redirect to a goodbye page
            window.location.href = '/';
        } catch (error) {
            throw new Error('Failed to delete account. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    // Check for existing session on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const checkSession = async ()=>{
            setLoading(true);
            await refreshSession();
            setLoading(false);
        };
        checkSession();
    }, []);
    // Set up session refresh interval
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (user) {
            const interval = setInterval(()=>{
                refreshSession();
            }, 5 * 60 * 1000); // Check every 5 minutes
            return ()=>clearInterval(interval);
        }
    }, [
        user
    ]);
    const value = {
        user,
        loading,
        login,
        register,
        logout,
        resetPassword,
        refreshSession,
        updateProfile,
        updateSettings,
        upgradePlan,
        deleteAccount,
        isAuthenticated: !!user
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: value,
        children: [
            sessionExpired && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed top-4 right-4 z-50 max-w-md",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$components$2f$ui$2f$Alert$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Alert"], {
                    variant: "warning",
                    title: "Session Expired",
                    children: "Your session has expired. Please sign in again to continue."
                }, void 0, false, {
                    fileName: "[project]/services/web/src/components/auth/SessionManager.tsx",
                    lineNumber: 493,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/services/web/src/components/auth/SessionManager.tsx",
                lineNumber: 492,
                columnNumber: 9
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/services/web/src/components/auth/SessionManager.tsx",
        lineNumber: 490,
        columnNumber: 5
    }, this);
}
}),
"[project]/services/web/src/components/ui/Button.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/web/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
;
const Button = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"])(({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref)=>{
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        ghost: 'text-gray-700 hover:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700'
    };
    const sizes = {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(baseClasses, variants[variant], sizes[size], className),
        ref: ref,
        disabled: disabled || loading,
        ...props,
        children: [
            loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                className: "mr-2 h-4 w-4 animate-spin",
                xmlns: "http://www.w3.org/2000/svg",
                fill: "none",
                viewBox: "0 0 24 24",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        className: "opacity-25",
                        cx: "12",
                        cy: "12",
                        r: "10",
                        stroke: "currentColor",
                        strokeWidth: "4"
                    }, void 0, false, {
                        fileName: "[project]/services/web/src/components/ui/Button.tsx",
                        lineNumber: 47,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "opacity-75",
                        fill: "currentColor",
                        d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    }, void 0, false, {
                        fileName: "[project]/services/web/src/components/ui/Button.tsx",
                        lineNumber: 55,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/services/web/src/components/ui/Button.tsx",
                lineNumber: 41,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0)),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/services/web/src/components/ui/Button.tsx",
        lineNumber: 29,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
Button.displayName = 'Button';
;
}),
"[project]/services/web/src/lib/error-handler.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Global error handling utilities
__turbopack_context__.s([
    "AppError",
    ()=>AppError,
    "AuthenticationError",
    ()=>AuthenticationError,
    "NetworkError",
    ()=>NetworkError,
    "ValidationError",
    ()=>ValidationError,
    "getErrorMessage",
    ()=>getErrorMessage,
    "handleError",
    ()=>handleError,
    "logError",
    ()=>logError
]);
class AppError extends Error {
    code;
    statusCode;
    isOperational;
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, isOperational = true){
        super(message), this.code = code, this.statusCode = statusCode, this.isOperational = isOperational;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
class ValidationError extends AppError {
    constructor(message, field){
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}
class NetworkError extends AppError {
    constructor(message = 'Network connection failed'){
        super(message, 'NETWORK_ERROR', 0);
        this.name = 'NetworkError';
    }
}
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required'){
        super(message, 'AUTH_ERROR', 401);
        this.name = 'AuthenticationError';
    }
}
function handleError(error) {
    if (error instanceof AppError) {
        return error;
    }
    if (error instanceof Error) {
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('timeout')) {
            return new NetworkError(error.message);
        }
        // Authentication errors
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            return new AuthenticationError();
        }
        // Validation errors
        if (error.message.includes('400') || error.message.includes('Bad Request')) {
            return new ValidationError(error.message);
        }
        return new AppError(error.message, 'UNKNOWN_ERROR', 500);
    }
    return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
}
function getErrorMessage(error) {
    const appError = handleError(error);
    return appError.message;
}
function logError(error, context) {
    const appError = handleError(error);
    console.error(`[${context || 'APP'}] ${appError.name}: ${appError.message}`, {
        code: appError.code,
        statusCode: appError.statusCode,
        stack: appError.stack
    });
}
}),
"[project]/services/web/src/components/common/ErrorBoundary.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ErrorBoundary",
    ()=>ErrorBoundary
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$components$2f$ui$2f$Alert$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/web/src/components/ui/Alert.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$components$2f$ui$2f$Button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/web/src/components/ui/Button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-ssr] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$alert$2d$triangle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/alert-triangle.js [app-ssr] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$lib$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/web/src/lib/error-handler.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
class ErrorBoundary extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Component"] {
    constructor(props){
        super(props);
        this.state = {
            hasError: false
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error
        };
    }
    componentDidCatch(error, errorInfo) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$lib$2f$error$2d$handler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logError"])(error, 'ErrorBoundary');
        console.error('Error boundary caught an error:', error, errorInfo);
    }
    handleRetry = ()=>{
        this.setState({
            hasError: false,
            error: undefined
        });
    };
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-h-screen flex items-center justify-center bg-gray-50 px-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-md w-full",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$components$2f$ui$2f$Alert$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Alert"], {
                            variant: "error",
                            className: "mb-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$alert$2d$triangle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                    className: "w-5 h-5"
                                }, void 0, false, {
                                    fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                                    lineNumber: 48,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-semibold",
                                            children: "Something went wrong"
                                        }, void 0, false, {
                                            fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                                            lineNumber: 50,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm mt-1",
                                            children: this.state.error?.message || 'An unexpected error occurred'
                                        }, void 0, false, {
                                            fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                                            lineNumber: 51,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                                    lineNumber: 49,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                            lineNumber: 47,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex space-x-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$components$2f$ui$2f$Button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    onClick: this.handleRetry,
                                    className: "flex items-center",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                            className: "w-4 h-4 mr-2"
                                        }, void 0, false, {
                                            fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                                            lineNumber: 59,
                                            columnNumber: 17
                                        }, this),
                                        "Try Again"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                                    lineNumber: 58,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$services$2f$web$2f$src$2f$components$2f$ui$2f$Button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    variant: "secondary",
                                    onClick: ()=>window.location.href = '/dashboard',
                                    children: "Go to Dashboard"
                                }, void 0, false, {
                                    fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                                    lineNumber: 62,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                            lineNumber: 57,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                    lineNumber: 46,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/services/web/src/components/common/ErrorBoundary.tsx",
                lineNumber: 45,
                columnNumber: 9
            }, this);
        }
        return this.props.children;
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d658afd8._.js.map