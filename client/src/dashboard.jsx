const [session, setSession] = useState(null);

// 1. Setup Form (Before session starts)
const startSession = async (config) => {
    const res = await fetch(`${API}/api/session/start`, {
        method: 'POST',
        body: JSON.stringify(config) // title, numCourts, isDoubles, playerNames
    });
    const data = await res.json();
    setSession(data);
};

// 2. The "Refresh" Fix
// Use useEffect to check if an active session exists for this user on mount
useEffect(() => {
    const fetchActiveSession = async () => {
        const res = await fetch(`${API}/api/session/active`);
        if (res.ok) {
            const data = await res.json();
            setSession(data);
        }
    };
    fetchActiveSession();
}, []);