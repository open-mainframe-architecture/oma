/**
 * Convert callback style to promise-based code.
 * @param code Closure with callback-style code 
 * @returns A new closure that returns a promise-based version of the code
 */
export default function denodeify<T>(code: ((...parameters: any[]) => void)): T {
  return <any>((...parameters: any[]) => new Promise((resolve, reject) => {
    code(...parameters, (error: any, result: any) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  }))
}
