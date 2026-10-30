import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { children:ReactNode; variant?:'primary'|'secondary'|'ghost'; className?:string }
export function Button({children,variant='primary',className='',...props}:Props){
  const styles={ primary:'bg-accent hover:bg-accent-hover text-white shadow-[0_8px_30px_rgba(225,29,72,.25)]', secondary:'bg-white/10 hover:bg-white/15 border border-white/10 text-white', ghost:'bg-transparent hover:bg-white/10 text-white' }
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`} {...props}>{children}</button>
}
