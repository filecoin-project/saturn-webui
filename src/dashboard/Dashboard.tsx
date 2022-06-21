import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import * as api from '@/api'
import { MetricsResponse, TimePeriod } from '@/api.types'
import { pastDateRange } from '@/date-utils'
import RequestsChart from './RequestsChart'
import BandwidthChart from './BandwidthChart'
import EarningsChart from './EarningsChart'
import bytes from 'bytes'

interface HeaderProps {
    metricsRes: MetricsResponse
    address: string
    period: TimePeriod,
    setPeriod: Dispatch<SetStateAction<TimePeriod>>
}

function periodToDateRange (period: TimePeriod) {
    switch (period) {
    case TimePeriod.WEEK:
        return pastDateRange('week')
    case TimePeriod.TWO_WEEK:
        return pastDateRange('week', 2)
    case TimePeriod.MONTH:
        return pastDateRange('month')
    // case TimePeriod.SIX_MONTH:
    //     return pastDateRange('month', 6)
    }
}

function Header ({ metricsRes, address, period, setPeriod }: HeaderProps) {
    const options = Object.values(TimePeriod)

    const { earnings, nodes, metrics } = metricsRes

    // Might be worth using useMemo here if data sets become large.
    const totalEarnings = earnings.reduce((memo, earning) => memo + earning.filAmount, 0)
    const totalBandwidth = metrics.reduce((memo, metric) => memo + metric.numBytes, 0)
    const totalRetrievals = metrics.reduce((memo, metric) => memo + metric.numRequests, 0)
    const numActiveNodes = nodes.find(d => d.active)?.count ?? 0
    const numInactiveNodes = nodes.find(d => !d.active)?.count ?? 0

    return (
        <div className="flex flex-wrap justify-between items-start gap-4 pb-6">
            <div className="grid grid-cols-[auto_auto] gap-y-2 gap-x-4 border-2
            border-slate-500 p-4 rounded">
                <div>Address</div><div className="truncate">{address}</div>
                <div>Nodes</div>
                <div>
                    {numActiveNodes.toLocaleString()} Active
                    {numInactiveNodes > 0 && `, ${numInactiveNodes} Inactive`}
                </div>
                <div>Earnings</div><div>{totalEarnings.toLocaleString()} FIL</div>
                <div>Bandwidth</div><div>{bytes(totalBandwidth, { unitSeparator: ' ' })}</div>
                <div>Retrievals</div><div>{totalRetrievals.toLocaleString()}</div>
            </div>
            <select
                value={period}
                onChange={e => setPeriod(e.target.value as TimePeriod)}
                className="m-l-auto bg-slate-900 p-2 rounded">
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    )
}

function Dashboard () {
    const { address = '' } = useParams()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<null | string>(null)

    const [
        metricsRes, setMetricsRes
    ] = useState<MetricsResponse>({ earnings: [], nodes: [], metrics: [] })

    const [period, setPeriod] = useState<TimePeriod>(TimePeriod.WEEK)
    const dateRange = periodToDateRange(period)
    const { startDate, endDate } = dateRange

    // Don't update chart axes until data is fetched.
    // It looks weird if axes update immediately.
    const [chartDateRange, setChartDateRange] = useState(dateRange)

    const fetchData = async () => {
        if (!address) { return }

        try {
            setIsLoading(true)
            setError(null)

            const metricsRes = await api.fetchMetrics(
                address, startDate, endDate)
            setMetricsRes(metricsRes)
            setChartDateRange(dateRange)
        } catch (err) {
            if (err instanceof Error) {
                setError(err?.message ?? 'Error retrieving metrics.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [address, startDate.getTime(), endDate.getTime()])

    const { earnings, metrics } = metricsRes
    const chartProps = { dateRange: chartDateRange, isLoading }

    return (
        <div className="flex-1 flex flex-col gap-4 pt-4">
            {error && <p className="text-center text-red-600 text-lg">Error: {error}</p>}
            <Header {...{ metricsRes, address, period, setPeriod }}/>
            <div className="flex flex-wrap justify-center gap-12">
                <EarningsChart earnings={earnings} {...chartProps} />
                <RequestsChart metrics={metrics} {...chartProps} />
                <BandwidthChart metrics={metrics} {...chartProps} />
            </div>
        </div>
    )
}

export default Dashboard