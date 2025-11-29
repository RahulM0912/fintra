
import Navbar from '@/components/NavBar';
import React, { ReactNode} from 'react'


function layout({children}: {children: ReactNode}) {
    return (
        <div className='relative flex h-screen w-full flex-col'>
            <Navbar />
            <div className="flex-1 w-full min-h-0 flex flex-col">
                {children}
            </div>
        </div>
    )
}

export default layout;