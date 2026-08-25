// one-off: find real exercise ids for the workout demo seed
import fs from 'node:fs'
const src = fs.readFileSync('C:/Users/ulate/MiGym/frontend/src/lib/exercises-data.js', 'utf8')
const names = ['bench press', 'squat', 'deadlift', 'overhead press', 'barbell row', 'lat pull', 'push-up', 'leg press']
for (const name of names) {
  const re = new RegExp('\\{"id":"([a-z0-9]+)","n":"[^"]*' + name, 'i')
  const m = re.exec(src)
  console.log(name, '->', m ? m[1] : '?')
}
