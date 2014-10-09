from bs4 import BeautifulSoup
from urllib2 import urlopen
import string

print 'id,name,team,position,school'

base_url = 'http://espn.go.com/nfl/college/_/letter/'

player_id = 0

for letter in string.lowercase:
    html = urlopen(base_url + letter).read()
    soup = BeautifulSoup(html)
    section = soup.find(id="my-players-table")
    table = section.table

    college = ''

    for row in table.find_all('tr'):
        if 'stathead' in row['class']:
            # new college
            college = row.string
        elif ('oddrow' in row['class'] or 'evenrow' in row['class']):
            player = [str(player_id)]
            for col in row.find_all('td'):
                #if col.string == None: #wtf?
                #  col.string = 'none'
                try:
                    player.append(str(col.string))
                except:
                    player.append('')
            if len(player) > 0: # if this row had anything
                if 'No active players.' not in player:
                    player.append(college)
                    print str(','.join(player))
                    player_id += 1
