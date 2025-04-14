import Page from '@/components/page'
import Section from '@/components/section'
import RedditUserLookup from '@/components/reddit-user-lookup'

const Index = () => (
  <Page>
    <Section>
      <h1 className='text-3xl font-bold text-zinc-800 dark:text-zinc-200 mb-2 text-center'>
        Could They Be A Bot?
      </h1>
      <p className='text-zinc-600 dark:text-zinc-400 text-center mb-8'>
        Analyze Reddit users to determine if they might be bots
      </p>

      <RedditUserLookup />

      <div className='mt-12 pt-4 border-t border-zinc-200 dark:border-zinc-800'>
        <h3 className='text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2'>
          How It Works
        </h3>
        <p className='text-zinc-600 dark:text-zinc-400 mb-4'>
          Our tool analyzes Reddit user behavior patterns and posting history to identify potential bot accounts. 
          We look at account age, posting frequency, comment similarity, and other metrics to generate a bot probability score.
        </p>
        <p className='text-sm text-zinc-600 dark:text-zinc-400'>
          Note: This is a demonstration using simulated data. For research purposes only.
        </p>
      </div>
    </Section>
  </Page>
)

export default Index
