import { 
    Box, 
    Typography, 
    RadioGroup, 
    FormControlLabel, 
    Radio, 
    Paper 
} from '@mui/material'
import type { IpOption } from '../types'

interface IpSelectorProps {
    options: IpOption[]
    selectedIp: string | null
    onSelectIp: (ip: string) => void
}

export function IpSelector({ options, selectedIp, onSelectIp }: IpSelectorProps) {
    return (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Select IP Address
            </Typography>
            <RadioGroup
                value={selectedIp || ''}
                onChange={(e) => onSelectIp(e.target.value)}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {options.map((option) => (
                        <FormControlLabel
                            key={option.id}
                            value={option.address}
                            control={<Radio />}
                            label={
                                <Box>
                                    <Typography variant="body1">
                                        {option.address}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {option.description}
                                    </Typography>
                                </Box>
                            }
                        />
                    ))}
                </Box>
            </RadioGroup>
        </Paper>
    )
}