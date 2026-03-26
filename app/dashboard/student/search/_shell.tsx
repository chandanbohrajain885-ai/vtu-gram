'use client'
import dynamic from 'next/dynamic'
const SearchClient = dynamic(() => import('./_client'), { ssr: false })
export default function SearchShell() { return <SearchClient /> }
