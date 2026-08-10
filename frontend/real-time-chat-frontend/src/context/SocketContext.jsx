import {createContext, useContext, useEffect, useState} from 'react';
import {io} from 'socket.io-client';
import {useAuth} from './AuthContext.jsx';

const SocketContext = createContext({});

export const SocketProvider = ({children}) => {
    const { session, user} = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(()=>{
        if(session?.access_token && user){
            const newSocket = io('http://localhost:3000',{
                extraHeaders: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            setSocket(newSocket);

            newSocket.on('connect', ()=>{
                console.log('🟢 Connected to Socket Server with ID:', newSocket.id);
            });

            newSocket.on('connect_error', (err) => {
                console.error('🔴 Socket Connection Error:', err.message);
            });
            return () => {
                newSocket.disconnect();
            };
        }
        else{
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    },[session]);

    return(
        <SocketContext.Provider value={{socket}}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => {
    return useContext(SocketContext);
};