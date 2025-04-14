import Link from 'next/link'
import { useRouter } from 'next/router'

// Removed the links array since we're making this a single page app

const Appbar = () => {
	const router = useRouter()

	return (
		<div className='fixed top-0 left-0 z-20 w-full bg-zinc-900 pt-safe'>
			<header className='border-b bg-zinc-100 px-safe dark:border-zinc-800 dark:bg-zinc-900'>
				<div className='mx-auto flex h-20 max-w-screen-md items-center justify-between px-6'>
					<Link href='/'>
						<h1 className='font-medium'>Could They Be A Bot?</h1>
					</Link>

					<nav className='flex items-center'>
						<div
							title='Bot Detection'
							className='h-10 w-10 rounded-full bg-zinc-200 bg-cover bg-center shadow-inner dark:bg-zinc-800'
							style={{
								backgroundImage:
									'url(https://images.unsplash.com/photo-1612480797665-c96d261eae09?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80)',
							}}
						/>
					</nav>
				</div>
			</header>
		</div>
	)
}

export default Appbar
