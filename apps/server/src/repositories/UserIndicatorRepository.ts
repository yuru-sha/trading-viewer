import { PrismaClient, UserIndicator, Prisma } from '@prisma/client'

export interface CreateUserIndicatorData {
  userId: string
  symbol: string
  timeframe?: string
  type: string
  name: string
  parameters: Record<string, any>
  visible?: boolean
  style?: Record<string, any>
  position?: number
}

export interface UpdateUserIndicatorData {
  name?: string
  parameters?: Record<string, any>
  visible?: boolean
  style?: Record<string, any>
  position?: number
}

export class UserIndicatorRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateUserIndicatorData): Promise<UserIndicator> {
    return await this.prisma.userIndicator.create({
      data: {
        userId: data.userId,
        symbol: data.symbol,
        timeframe: data.timeframe ?? 'D',
        type: data.type,
        name: data.name,
        parameters: JSON.stringify(data.parameters),
        visible: data.visible ?? true,
        style: data.style ? JSON.stringify(data.style) : null,
        position: data.position ?? 0,
      },
    })
  }

  async findById(id: string): Promise<UserIndicator | null> {
    return await this.prisma.userIndicator.findUnique({
      where: { id },
    })
  }

  async findByUserId(userId: string): Promise<UserIndicator[]> {
    return await this.prisma.userIndicator.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    })
  }

  async findByUserIdAndSymbol(userId: string, symbol: string): Promise<UserIndicator[]> {
    return await this.prisma.userIndicator.findMany({
      where: { userId, symbol },
      orderBy: { position: 'asc' },
    })
  }

  async findByUserIdSymbolAndTimeframe(userId: string, symbol: string, timeframe: string): Promise<UserIndicator[]> {
    return await this.prisma.userIndicator.findMany({
      where: { userId, symbol, timeframe },
      orderBy: { position: 'asc' },
    })
  }

  async findByUserIdSymbolTimeframeAndName(
    userId: string,
    symbol: string,
    timeframe: string,
    name: string
  ): Promise<UserIndicator | null> {
    return await this.prisma.userIndicator.findUnique({
      where: {
        userId_symbol_timeframe_name: {
          userId,
          symbol,
          timeframe,
          name,
        },
      },
    })
  }

  async update(id: string, data: UpdateUserIndicatorData): Promise<UserIndicator> {
    const updateData: Prisma.UserIndicatorUpdateInput = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.parameters !== undefined) updateData.parameters = JSON.stringify(data.parameters)
    if (data.visible !== undefined) updateData.visible = data.visible
    if (data.style !== undefined) updateData.style = data.style ? JSON.stringify(data.style) : null
    if (data.position !== undefined) updateData.position = data.position

    updateData.updatedAt = new Date()

    return await this.prisma.userIndicator.update({
      where: { id },
      data: updateData,
    })
  }

  async delete(id: string): Promise<UserIndicator> {
    return await this.prisma.userIndicator.delete({
      where: { id },
    })
  }

  async deleteByUserIdSymbolTimeframeAndName(
    userId: string,
    symbol: string,
    timeframe: string,
    name: string
  ): Promise<UserIndicator> {
    return await this.prisma.userIndicator.delete({
      where: {
        userId_symbol_timeframe_name: {
          userId,
          symbol,
          timeframe,
          name,
        },
      },
    })
  }

  async countByUserId(userId: string): Promise<number> {
    return await this.prisma.userIndicator.count({
      where: { userId },
    })
  }

  async updatePositions(
    userId: string,
    symbol: string,
    timeframe: string,
    positions: Array<{ id: string; position: number }>
  ): Promise<void> {
    await this.prisma.$transaction(
      positions.map(({ id, position }) =>
        this.prisma.userIndicator.update({
          where: { id },
          data: { position },
        })
      )
    )
  }

  // Helper method to parse JSON fields
  parseIndicator(indicator: UserIndicator) {
    return {
      ...indicator,
      parameters: JSON.parse(indicator.parameters),
      style: indicator.style ? JSON.parse(indicator.style) : null,
    }
  }

  // Bulk operations
  async createMany(data: CreateUserIndicatorData[]): Promise<Prisma.BatchPayload> {
    return await this.prisma.userIndicator.createMany({
      data: data.map(item => ({
        userId: item.userId,
        symbol: item.symbol,
        timeframe: item.timeframe ?? 'D',
        type: item.type,
        name: item.name,
        parameters: JSON.stringify(item.parameters),
        visible: item.visible ?? true,
        style: item.style ? JSON.stringify(item.style) : null,
        position: item.position ?? 0,
      })),
    })
  }

  async deleteMany(userId: string, symbol?: string): Promise<Prisma.BatchPayload> {
    const where: Prisma.UserIndicatorWhereInput = { userId }
    if (symbol) where.symbol = symbol

    return await this.prisma.userIndicator.deleteMany({
      where,
    })
  }
}
