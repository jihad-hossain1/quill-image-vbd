import { quotes} from './quotes/quotes.js'


export const randomQuote = (): string => {

    return quotes[Math.floor(Math.random() * quotes.length)];
}
