import { useEffect, RefObject } from 'react';

export const useClickOutside = (ref: RefObject<HTMLElement>, handler: () => void) => {
    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                handler();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [handler, ref]);
};