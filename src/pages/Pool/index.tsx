import { Trans } from '@lingui/macro'
import { BrowserEvent, InterfaceElementName, InterfaceEventName, InterfacePageName } from '@uniswap/analytics-events'
import { useWeb3React } from '@web3-react/core'
import { Trace, TraceEvent } from 'analytics'
import { useToggleAccountDrawer } from 'components/AccountDrawer'
import { ButtonGray, ButtonPrimary, ButtonText } from 'components/Button'
import { AutoColumn } from 'components/Column'
import { FlyoutAlignment, Menu } from 'components/Menu'
import PositionList from 'components/PositionList'
import { RowBetween, RowFixed } from 'components/Row'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import { isSupportedChain } from 'constants/chains'
import { useFilterPossiblyMaliciousPositions } from 'hooks/useFilterPossiblyMaliciousPositions'
import { useNetworkSupportsV2 } from 'hooks/useNetworkSupportsV2'
import { useV3Positions } from 'hooks/useV3Positions'
import { useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, ChevronDown, ChevronsRight, Inbox, Layers } from 'react-feather'
import { Link } from 'react-router-dom'
import { useUserHideClosedPositions } from 'state/user/hooks'
import styled, { css, useTheme } from 'styled-components'
import { HideSmall, ThemedText } from 'theme/components'
import { PositionDetails } from 'types/position'

import CTACards from './CTACards'
import PoolCards from './PoolCard'
import { LoadingRows } from './styled'

const PageWrapper = styled(AutoColumn)`
  width: 100%;
  display: flex;
  justify-content: center;

  @media (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    max-width: 800px;
    padding-top: 48px;
  }

  @media (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    max-width: 500px;
    padding-top: 20px;
  }
`
const TitleRow = styled(RowBetween)`
  color: ${({ theme }) => theme.neutral2};
  @media (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    flex-wrap: wrap;
    gap: 12px;
    width: 100%;
  }
`
const ButtonRow = styled(RowFixed)`
  & > *:not(:last-child) {
    margin-left: 8px;
  }

  @media (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
  }
`
const PoolMenu = styled(Menu)`
  margin-left: 0;
  @media (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    flex: 1 1 auto;
    width: 50%;
  }

  a {
    width: 100%;
  }
`
const PoolMenuItem = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-weight: 535;
`
const MoreOptionsButton = styled(ButtonGray)`
  border-radius: 12px;
  flex: 1 1 auto;
  padding: 6px 8px;
  width: 100%;
  background-color: ${({ theme }) => theme.surface1};
  border: 1px solid ${({ theme }) => theme.surface3};
  margin-right: 8px;
`

const MoreOptionsText = styled(ThemedText.BodyPrimary)`
  align-items: center;
  display: flex;
`

const ErrorContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: auto;
  max-width: 300px;
  min-height: 25vh;
`

const IconStyle = css`
  width: 48px;
  height: 48px;
  margin-bottom: 0.5rem;
`

const NetworkIcon = styled(AlertTriangle)`
  ${IconStyle}
`

const InboxIcon = styled(Inbox)`
  ${IconStyle}
`

const ResponsiveButtonPrimary = styled(ButtonPrimary)`
  border-radius: 12px;
  font-size: 16px;
  padding: 6px 8px;
  width: fit-content;
  @media (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    flex: 1 1 auto;
    width: 50%;
  }
`

const MainContentWrapper = styled.main`
  background-color: ${({ theme }) => theme.surface1};
  border: 1px solid ${({ theme }) => theme.surface3};
  padding: 0;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const MainContainerTitleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  h2 {
    color: '#101828';
    font-weight: 600;
    font-size: 36px;
    font-family: 'Inter', sans-serif;
  }
`

const PoolsTypesSelect = styled.div`
  border: 1px solid #c6cbd9;
  margin-bottom: 30px;
  border-radius: 8px;
  width: 267px;
  display: flex;
  justify-content: space-between;
  column-gap: 10px;
  height: 52px;
  padding: 5px;

  button {
    background-color: inherit;
    color: #9a9aaf;
    font-size: 14px;
    border: none;
    cursor: pointer;
    transition: all linear 0.3s;
    width: 84px;
    border-radius: 4px;
    :hover {
      background-color: #e6e6e7;
    }
  }

  .selected {
    background-color: #eff2f5;
    border: 1px solid #c6cbd9;
    color: #2e2e3a;
    cursor: inherit;
  }
`
function PositionsLoadingPlaceholder() {
  return (
    <LoadingRows>
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
    </LoadingRows>
  )
}

function WrongNetworkCard() {
  const theme = useTheme()

  return (
    <>
      <PageWrapper>
        <AutoColumn gap="lg" justify="center">
          <AutoColumn gap="lg" style={{ width: '100%' }}>
            <TitleRow padding="0">
              <ThemedText.LargeHeader>
                <Trans>Pools</Trans>
              </ThemedText.LargeHeader>
            </TitleRow>

            <MainContentWrapper>
              <ErrorContainer>
                <ThemedText.BodyPrimary color={theme.neutral3} textAlign="center">
                  <NetworkIcon strokeWidth={1.2} />
                  <div data-testid="pools-unsupported-err">
                    <Trans>Your connected network is unsupported.</Trans>
                  </div>
                </ThemedText.BodyPrimary>
              </ErrorContainer>
            </MainContentWrapper>
          </AutoColumn>
        </AutoColumn>
      </PageWrapper>
      <SwitchLocaleLink />
    </>
  )
}

export type PoolsType = 'all' | 'ltn' | 'ltf'

export default function Pool() {
  const { account, chainId } = useWeb3React()
  const networkSupportsV2 = useNetworkSupportsV2()
  const toggleWalletDrawer = useToggleAccountDrawer()
  const [activePoolType, setActivePoolType] = useState<PoolsType>('all')

  const theme = useTheme()
  const [userHideClosedPositions, setUserHideClosedPositions] = useUserHideClosedPositions()

  const { positions, loading: positionsLoading } = useV3Positions(account)

  const [openPositions, closedPositions] = positions?.reduce<[PositionDetails[], PositionDetails[]]>(
    (acc, p) => {
      acc[p.liquidity?.isZero() ? 1 : 0].push(p)
      return acc
    },
    [[], []]
  ) ?? [[], []]

  const userSelectedPositionSet = useMemo(
    () => [...openPositions, ...(userHideClosedPositions ? [] : closedPositions)],
    [closedPositions, openPositions, userHideClosedPositions]
  )

  const filteredPositions = useFilterPossiblyMaliciousPositions(userSelectedPositionSet)

  if (!isSupportedChain(chainId)) {
    return <WrongNetworkCard />
  }

  const showConnectAWallet = Boolean(!account)

  const menuItems = [
    {
      content: (
        <PoolMenuItem>
          <Trans>Migrate</Trans>
          <ChevronsRight size={16} />
        </PoolMenuItem>
      ),
      link: '/migrate/v2',
      external: false,
    },
    {
      content: (
        <PoolMenuItem>
          <Trans>V2 liquidity</Trans>
          <Layers size={16} />
        </PoolMenuItem>
      ),
      link: '/pools/v2',
      external: false,
    },
    {
      content: (
        <PoolMenuItem>
          <Trans>Learn</Trans>
          <BookOpen size={16} />
        </PoolMenuItem>
      ),
      link: 'https://support.uniswap.org/hc/en-us/categories/8122334631437-Providing-Liquidity-',
      external: true,
    },
  ]

  const NewPositionScreen = () => {
    return (
      <>
        <TitleRow padding="0">
          <ThemedText.LargeHeader>
            <Trans>Pools</Trans>
          </ThemedText.LargeHeader>
          <ButtonRow>
            {networkSupportsV2 && (
              <PoolMenu
                menuItems={menuItems}
                flyoutAlignment={FlyoutAlignment.LEFT}
                ToggleUI={(props: any) => (
                  <MoreOptionsButton {...props}>
                    <MoreOptionsText>
                      <Trans>More</Trans>
                      <ChevronDown size={15} />
                    </MoreOptionsText>
                  </MoreOptionsButton>
                )}
              />
            )}
            <ResponsiveButtonPrimary data-cy="join-pool-button" id="join-pool-button" as={Link} to="/add/ETH">
              + <Trans>New position</Trans>
            </ResponsiveButtonPrimary>
          </ButtonRow>
        </TitleRow>

        <MainContentWrapper>
          {positionsLoading ? (
            <PositionsLoadingPlaceholder />
          ) : filteredPositions && closedPositions && filteredPositions.length > 0 ? (
            <PositionList
              positions={filteredPositions}
              setUserHideClosedPositions={setUserHideClosedPositions}
              userHideClosedPositions={userHideClosedPositions}
            />
          ) : (
            <ErrorContainer>
              <ThemedText.BodyPrimary color={theme.neutral3} textAlign="center">
                <InboxIcon strokeWidth={1} style={{ marginTop: '2em' }} />
                <div>
                  <Trans>Your active V3 liquidity positions will appear here.</Trans>
                </div>
              </ThemedText.BodyPrimary>
              {!showConnectAWallet && closedPositions.length > 0 && (
                <ButtonText
                  style={{ marginTop: '.5rem' }}
                  onClick={() => setUserHideClosedPositions(!userHideClosedPositions)}
                >
                  <Trans>Show closed positions</Trans>
                </ButtonText>
              )}
              {showConnectAWallet && (
                <TraceEvent
                  events={[BrowserEvent.onClick]}
                  name={InterfaceEventName.CONNECT_WALLET_BUTTON_CLICKED}
                  properties={{ received_swap_quote: false }}
                  element={InterfaceElementName.CONNECT_WALLET_BUTTON}
                >
                  <ButtonPrimary
                    style={{ marginTop: '2em', marginBottom: '2em', padding: '8px 16px' }}
                    onClick={toggleWalletDrawer}
                  >
                    <Trans>Connect a wallet</Trans>
                  </ButtonPrimary>
                </TraceEvent>
              )}
            </ErrorContainer>
          )}
        </MainContentWrapper>
        <HideSmall>
          <CTACards />
        </HideSmall>
      </>
    )
  }

  const handleFilterPoolByType = (poolType: PoolsType) => {
    setActivePoolType(poolType)
  }

  return (
    <Trace page={InterfacePageName.POOL_PAGE} shouldLogImpression>
      <PageWrapper>
        <AutoColumn gap="lg" justify="center">
          <AutoColumn gap="lg" style={{ width: '100%' }}>
            <MainContainerTitleWrapper>
              <h2>Pools de liquidez</h2>
              <PoolsTypesSelect>
                <button
                  onClick={() => handleFilterPoolByType('all')}
                  className={`${activePoolType === 'all' && 'selected'}`}
                >
                  Ver todos
                </button>
                <button
                  onClick={() => handleFilterPoolByType('ltn')}
                  className={`${activePoolType === 'ltn' && 'selected'}`}
                >
                  LTN
                </button>
                <button
                  onClick={() => handleFilterPoolByType('ltf')}
                  className={`${activePoolType === 'ltf' && 'selected'}`}
                >
                  LTF
                </button>
              </PoolsTypesSelect>
              <PoolCards activePoolType={activePoolType} />
            </MainContainerTitleWrapper>
          </AutoColumn>
        </AutoColumn>
      </PageWrapper>
      <SwitchLocaleLink />
    </Trace>
  )
}
